import { combiner } from '@/lib/combiner'

type TestCase = {
  description: string
  arrays: string[][]
  expectedMin: number
  expectedMax: number
  mustInclude?: string[]
  // Both strings appearing in the output means a duplicate wasn't caught
  mustNotDuplicate?: [string, string][]
}

const TEST_CASES: TestCase[] = [
  {
    description: 'exact duplicates across all three arrays',
    arrays: [
      ['cleaned the kitchen', 'vacuumed the living room'],
      ['cleaned the kitchen', 'vacuumed the living room'],
      ['cleaned the kitchen', 'vacuumed the living room'],
    ],
    expectedMin: 2,
    expectedMax: 2,
    mustInclude: ['kitchen', 'living room'],
  },
  {
    description: 'shortname vs full name for the same chore',
    arrays: [
      ['vacuumed the gbr', 'took out the trash'],
      ['vacuumed the green bathroom', 'took out the trash'],
      ['vacuumed the green bathroom', 'took out trash'],
    ],
    expectedMin: 2,
    expectedMax: 3,
    mustInclude: ['green bathroom', 'trash'],
  },
  {
    description: 'trailing punctuation and capitalization differences',
    arrays: [
      ['Cleaned the kitchen counters.', 'Did the laundry'],
      ['cleaned the kitchen counters', 'did the laundry.'],
      ['Cleaned kitchen counters', 'Did the laundry!'],
    ],
    expectedMin: 2,
    expectedMax: 3,
    mustInclude: ['kitchen', 'laundry'],
  },
  {
    description: 'mixed: some duplicates, some genuinely distinct items',
    arrays: [
      ['loaded the dishwasher', 'took out the trash', 'vacuumed the kitchen'],
      ['loaded the dishwasher', 'took out trash', 'wet swiffed the kitchen'],
      ['loaded dishwasher', 'took out the trash', 'vacuumed the kitchen'],
    ],
    expectedMin: 3,
    expectedMax: 5,
    mustInclude: ['dishwasher', 'trash', 'kitchen'],
  },
  {
    description: 'semantically equivalent with different wording',
    arrays: [
      ['put away clean dishes from the drying rack'],
      ['put away drying rack dishes'],
      ['cleared the drying rack'],
    ],
    expectedMin: 1,
    expectedMax: 1,
    mustInclude: ['drying rack'],
  },
  {
    description: 'semantically equivalent with different wording',
    arrays: [
      ['put away clean dishes from the drying rack'],
      ['put away drying rack dishes', 'drying rack'],
      ['cleared the drying rack', 'put away drying rack'],
    ],
    expectedMin: 2,
    expectedMax: 2,
    mustInclude: ['drying rack'],
  },
  {
    description: 'all items genuinely distinct — nothing should be dropped',
    arrays: [
      ['vacuumed the kitchen', 'cleaned the stovetop'],
      ['took out the trash', 'wiped down the counters'],
      ['did the laundry', 'cleaned the green bathroom'],
    ],
    expectedMin: 6,
    expectedMax: 6,
    mustInclude: ['kitchen', 'stovetop', 'trash', 'laundry', 'green bathroom'],
  },
  {
    description: 'ambiguous comma-separated phrasing in one array',
    arrays: [
      ['vacuumed kitchen, living room, and hallway'],
      [
        'vacuumed the kitchen',
        'vacuumed the living room',
        'vacuumed the hallway',
      ],
      ['vacuumed kitchen', 'vacuumed living room', 'vacuumed hallway'],
    ],
    expectedMin: 3,
    expectedMax: 6,
    mustInclude: ['kitchen', 'living room', 'hallway'],
  },
  {
    description:
      'loaded vs unloaded dishwasher are distinct and must both survive',
    arrays: [
      ['loaded the dishwasher', 'unloaded the dishwasher'],
      ['loaded dishwasher', 'unloaded dishwasher'],
      ['loaded the dishwasher', 'unloaded the dishwasher'],
    ],
    expectedMin: 2,
    expectedMax: 2,
    mustInclude: ['loaded', 'unloaded'],
  },
  {
    description: 'empty arrays mixed in',
    arrays: [
      ['vacuumed the living room', 'took out the trash'],
      [],
      ['vacuumed the living room'],
    ],
    expectedMin: 2,
    expectedMax: 2,
    mustInclude: ['living room', 'trash'],
  },
]

export default async function evalCombiner(): Promise<string> {
  console.log(`Running ${TEST_CASES.length} combiner eval cases...\n`)

  let passed = 0
  let failed = 0
  const failures: string[] = []

  for (const tc of TEST_CASES) {
    const result = await combiner(tc.arrays)

    const issues: string[] = []

    if (result.length < tc.expectedMin || result.length > tc.expectedMax) {
      issues.push(
        `count ${result.length} outside expected range [${tc.expectedMin}–${tc.expectedMax}]`,
      )
    }

    for (const needle of tc.mustInclude ?? []) {
      if (
        !result.some((item) =>
          item.toLowerCase().includes(needle.toLowerCase()),
        )
      ) {
        issues.push(`missing expected item containing "${needle}"`)
      }
    }

    for (const [a, b] of tc.mustNotDuplicate ?? []) {
      const hasA = result.some((item) =>
        item.toLowerCase().includes(a.toLowerCase()),
      )
      const hasB = result.some((item) =>
        item.toLowerCase().includes(b.toLowerCase()),
      )
      if (hasA && hasB) {
        issues.push(`duplicate not caught: both "${a}" and "${b}" appear`)
      }
    }

    const ok = issues.length === 0
    console.log(`${ok ? '✓' : '✗'} ${tc.description}`)
    console.log(`  Output (${result.length}): ${JSON.stringify(result)}`)
    if (!ok) {
      for (const issue of issues) console.log(`  ✗ ${issue}`)
      failures.push(`"${tc.description}": ${issues.join('; ')}`)
      failed++
    } else {
      passed++
    }
    console.log()
  }

  const pct = ((passed / TEST_CASES.length) * 100).toFixed(1)
  const summary = [
    `── Results ──────────────────────────`,
    `${passed}/${TEST_CASES.length} passed (${pct}%)`,
  ]

  if (failures.length > 0) {
    summary.push(`\nFailures:`)
    failures.forEach((f) => summary.push(`  ${f}`))
  }

  return summary.join('\n')
}
