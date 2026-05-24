import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { setChoreChunkEmbedding } from '@/plugins/chores/choreChunkEmbeddings'
import { DataSource } from 'typeorm'

export default async function backfillChoreChunks(dataSource: DataSource, overwrite = false): Promise<string> {
  const rows: Array<{ id: string; description: string }> = await dataSource.query(
    overwrite
      ? `SELECT id, description FROM chore ORDER BY "createdAt"`
      : `SELECT c.id, c.description FROM chore c WHERE NOT EXISTS (SELECT 1 FROM chore_chunk cc WHERE cc."choreId" = c.id) ORDER BY c."createdAt"`,
  )

  if (rows.length === 0) return overwrite ? 'No chores found.' : 'All chores already have chunks.'

  console.info(`Backfilling chunks for ${rows.length} chore(s)...`)

  let succeeded = 0
  let failed = 0

  for (const { id, description } of rows) {
    try {
      const embedding = await embedQwen(description)
      await setChoreChunkEmbedding(id, embedding)
      console.info(`  ✓ "${description}"`)
      succeeded++
    } catch (err) {
      console.error(`  ✗ "${description}":`, err)
      failed++
    }
  }

  return `Done. ${succeeded} succeeded, ${failed} failed.`
}
