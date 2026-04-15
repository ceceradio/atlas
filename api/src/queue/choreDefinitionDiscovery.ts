import { postgres } from '@/data-source'
import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { identifyNewChoreDefinitions } from '@/plugins/chores/identifyNewChoreDefinitions'
import { normalizeChore } from '@/plugins/chores/NormalizeChoreTool'
import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { setChoreDefinitionEmbedding } from '@/plugins/chores/choreDefinitionEmbeddings'
import { getAtlasPlugins } from '@/plugins'
import Queue from 'bull'
import { redisConfig } from './redis'

export type ChoreDefinitionDiscoveryJobData = {
  chores: string[]
}

export const choreDefinitionDiscoveryQueue = new Queue<ChoreDefinitionDiscoveryJobData>(
  'choreDefinitionDiscovery',
  { redis: redisConfig },
)

choreDefinitionDiscoveryQueue.process(async (job) => {
  const { chores } = job.data

  const newChores = await identifyNewChoreDefinitions(chores)

  if (newChores.length === 0) return { inserted: 0 }

  const repo = postgres.getRepository(ChoreDefinition)

  // Insert only; skip on unique-name conflict so concurrent jobs are safe
  await repo
    .createQueryBuilder()
    .insert()
    .into(ChoreDefinition)
    .values(newChores.map((name) => ({ name, size: null })))
    .orIgnore()
    .execute()

  // Reload the inserted definitions (orIgnore means identifiers may be empty for conflicts)
  const inserted = await repo.find({
    where: newChores.map((name) => ({ name })),
  })

  console.log(`choreDefinitionDiscovery: inserted ${inserted.length} new definition(s)`)

  // Embed each new definition (normalize name → embed → store), fire-and-forget
  Promise.all(
    inserted.map(async (def) => {
      try {
        const normalized = await normalizeChore(def.name)
        const embedding = await embedQwen(normalized)
        await setChoreDefinitionEmbedding(def.id, embedding)
      } catch (err) {
        console.error(`choreDefinitionDiscovery: failed to embed definition "${def.name}"`, err)
      }
    }),
  ).catch(() => {})

  // Send Discord vote messages for any that don't already have one
  const voteMonitor = getAtlasPlugins()?.choreDefinitionVoteMonitor
  if (voteMonitor && inserted.length > 0) {
    voteMonitor.sendVoteMessages(inserted).catch((err) =>
      console.error('choreDefinitionDiscovery: sendVoteMessages error', err),
    )
  }

  return { inserted: inserted.length, names: newChores }
})
