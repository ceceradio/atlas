import { matchChoreToDefinition, saveChoreDefinitionMatch } from '@/plugins/chores/matchChoreToDefinition'
import { DataSource } from 'typeorm'

export default async function backfillChoreDefinitionMatches(
  dataSource: DataSource,
  overwrite = false,
): Promise<string> {
  const rows: Array<{ id: string; description: string }> = await dataSource.query(
    overwrite
      ? `SELECT id, description FROM chore WHERE difficulty != 'not a chore' ORDER BY "createdAt"`
      : `SELECT c.id, c.description FROM chore c
         WHERE c.difficulty != 'not a chore'
           AND NOT EXISTS (SELECT 1 FROM chore_definition_match cdm WHERE cdm."choreId" = c.id)
         ORDER BY c."createdAt"`,
  )

  if (rows.length === 0) {
    return overwrite ? 'No chores found.' : 'All chores already have definition matches.'
  }

  console.info(`Backfilling definition matches for ${rows.length} chore(s)...`)

  let succeeded = 0
  let failed = 0
  let unmatched = 0

  for (const { id, description } of rows) {
    try {
      const defId = await matchChoreToDefinition(description)
      if (defId) {
        await saveChoreDefinitionMatch(id, defId)
        console.info(`  ✓ "${description}"`)
        succeeded++
      } else {
        console.info(`  — "${description}" (no match)`)
        unmatched++
      }
    } catch (err) {
      console.error(`  ✗ "${description}":`, err)
      failed++
    }
  }

  return `Done. ${succeeded} matched, ${unmatched} unmatched, ${failed} failed.`
}
