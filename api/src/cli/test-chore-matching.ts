/**
 * Test script for identifyNewChoreDefinitions.
 * Runs a set of labeled chore strings through the pipeline and reports accuracy.
 *
 * Usage: PGHOST=localhost npm run repl
 *   then: require('./src/cli/test-chore-matching').default().then(console.log)
 */

import { identifyNewChoreDefinitions } from '@/plugins/chores/identifyNewChoreDefinitions'

type TestCase = {
  chore: string
  expectNew: boolean
  note?: string
}

const TEST_CASES: TestCase[] = [
  // ── Should NOT be new — exact or near-exact matches ──────────────────────────
  { chore: 'vacuumed the living room', expectNew: false },
  { chore: 'unloaded the dishwasher', expectNew: false },
  { chore: 'put away drying rack dishes', expectNew: false },
  { chore: 'cleaned the stovetop', expectNew: false },
  { chore: 'cleaned the kitchen countertops', expectNew: false },
  { chore: 'wiped down the bathroom sink', expectNew: false },
  { chore: 'cooked dinner', expectNew: false },
  { chore: 'ordered groceries', expectNew: false },
  { chore: 'put away groceries', expectNew: false },
  { chore: 'rinsed the kitchen sink', expectNew: false },

  // ── Should NOT be new — qualifier variations ─────────────────────────────────
  { chore: 'quick vacuumed the kitchen', expectNew: false, note: 'qualifier stripped' },
  { chore: 'quickly vacuumed second floor hallway', expectNew: false, note: 'qualifier + specific room' },
  { chore: 'did a little vacuuming in the game room', expectNew: false, note: 'qualifier' },
  { chore: 'deep cleaned the green bathroom', expectNew: false, note: 'maps to deep cleaned [any bathroom]' },
  { chore: 'did a full house tidy', expectNew: false, note: 'maps to full house clean/tidy' },

  // ── Should NOT be new — room/wildcard substitutions ──────────────────────────
  { chore: 'did green bathroom laundry', expectNew: false, note: 'room laundry' },
  { chore: 'did pink bathroom towel laundry', expectNew: false, note: 'room + type laundry' },
  { chore: 'wet swiffed the kitchen', expectNew: false, note: 'large-room wet swiff' },
  { chore: 'wetswiffed the green bathroom', expectNew: false, note: 'specific room wet swiff' },
  { chore: 'took out kitchen trash', expectNew: false, note: 'room trash wildcard' },
  { chore: 'took out the trash', expectNew: false, note: 'generic trash' },
  { chore: 'took the trash out to the curb', expectNew: false, note: 'maps to took trash out to curb' },
  { chore: 'replaced the bags in the garage trash cans', expectNew: false, note: 'maps to tied off and rebagged garage cans' },

  // ── Should NOT be new — broad definitions cover these ────────────────────────
  { chore: 'hand washed pots and pans', expectNew: false, note: 'pots/pans variation' },
  { chore: 'threw out old food from the fridge', expectNew: false, note: 'threw out leftovers' },
  { chore: 'cleaned the toilet', expectNew: false, note: 'covered by toilet cleaning defs' },
  { chore: 'cleaned the shower', expectNew: false, note: 'maps to cleaned the tub/shower' },
  { chore: 'repaired the broken cabinet door', expectNew: false, note: 'maps to repaired [any fixture]' },
  { chore: 'mowed the front lawn', expectNew: false, note: 'maps to mowed the lawn' },
  { chore: 'shoveled the driveway', expectNew: false, note: 'maps to snow blowed/shoveled' },
  { chore: 'replaced the toilet paper roll', expectNew: false, note: 'maps to replaced toilet paper' },
  { chore: 'reorganized the junk drawer', expectNew: false, note: 'maps to reorganized [a small area]' },

  // ── Should be NEW — clearly novel chore types ────────────────────────────────
  { chore: 'cleaned the cat litter box', expectNew: true },
  { chore: 'walked the dog', expectNew: true },
  { chore: 'watered the plants', expectNew: true },
  { chore: 'changed the bed sheets', expectNew: true },
  { chore: 'washed the windows', expectNew: true },
  { chore: 'cleaned the gutters', expectNew: true },
  { chore: 'fed the cats', expectNew: true },

  // ── Should be NEW — sound similar to existing but are distinct ───────────────
  { chore: 'wiped down the bathroom mirror', expectNew: true, note: 'mirror ≠ sink' },
  { chore: 'cleaned the bathroom exhaust fan', expectNew: true, note: 'not covered by any appliance/fixture def' },
  { chore: 'descaled the coffee maker', expectNew: true, note: 'specific appliance maintenance, not general cleaning' },
  { chore: 'cleaned the range hood filter', expectNew: false, note: 'now a defined chore' },
]

export default async function testChoreMatching(): Promise<string> {
  console.log(`Running ${TEST_CASES.length} test cases...\n`)

  const shouldNotBeNew = TEST_CASES.filter((t) => !t.expectNew).map((t) => t.chore)
  const shouldBeNew = TEST_CASES.filter((t) => t.expectNew).map((t) => t.chore)

  // Run both batches through the pipeline
  const [falsePositives, truePositives] = await Promise.all([
    identifyNewChoreDefinitions(shouldNotBeNew),
    identifyNewChoreDefinitions(shouldBeNew),
  ])

  const falsePositiveSet = new Set(falsePositives)
  const truePositiveSet = new Set(truePositives)

  let correct = 0
  let incorrect = 0
  const failures: string[] = []

  for (const tc of TEST_CASES) {
    const wasCalledNew = tc.expectNew ? truePositiveSet.has(tc.chore) : falsePositiveSet.has(tc.chore)
    const passed = wasCalledNew === tc.expectNew

    const label = passed ? '✓' : '✗'
    const expected = tc.expectNew ? 'NEW' : 'not new'
    const got = wasCalledNew ? 'NEW' : 'not new'
    const note = tc.note ? ` [${tc.note}]` : ''

    console.log(`${label} "${tc.chore}"${note}`)
    if (!passed) console.log(`    expected ${expected}, got ${got}`)

    if (passed) correct++
    else {
      incorrect++
      failures.push(`"${tc.chore}" — expected ${expected}, got ${got}`)
    }
  }

  const pct = ((correct / TEST_CASES.length) * 100).toFixed(1)
  const summary = [
    `\n── Results ──────────────────────────`,
    `${correct}/${TEST_CASES.length} correct (${pct}%)`,
    `False positives (wrongly called new): ${falsePositives.length}`,
    `True positives (correctly called new): ${truePositives.length}/${shouldBeNew.length}`,
  ]

  if (failures.length > 0) {
    summary.push(`\nFailures:`)
    failures.forEach((f) => summary.push(`  ${f}`))
  }

  return summary.join('\n')
}
