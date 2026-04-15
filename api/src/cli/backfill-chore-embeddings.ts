import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { setChoreDefinitionEmbedding } from '@/plugins/chores/choreDefinitionEmbeddings'
import { DataSource } from 'typeorm'

export default async function backfillChoreEmbeddings(dataSource: DataSource, overwrite = false): Promise<string> {
  const rows: Array<{ id: string; name: string }> = await dataSource.query(
    overwrite
      ? `SELECT id, name FROM chore_definition ORDER BY name`
      : `SELECT id, name FROM chore_definition WHERE embedding IS NULL ORDER BY name`,
  )

  if (rows.length === 0) return overwrite ? 'No chore definitions found.' : 'All chore definitions already have embeddings.'

  console.info(`Backfilling embeddings for ${rows.length} definition(s)...`)

  let succeeded = 0
  let failed = 0

  for (const { id, name } of rows) {
    try {
      const embedding = await embedQwen(name)
      await setChoreDefinitionEmbedding(id, embedding)
      console.info(`  ✓ "${name}"`)
      succeeded++
    } catch (err) {
      console.error(`  ✗ "${name}":`, err)
      failed++
    }
  }

  return `Done. ${succeeded} succeeded, ${failed} failed.`
}
