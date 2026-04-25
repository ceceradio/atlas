import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { postgres } from '@/data-source'
import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { waitForAtlasPlugins } from '@/plugins'
import { setChoreDefinitionEmbedding } from '@/plugins/chores/choreDefinitionEmbeddings'
import { identifyChoreAlias } from '@/plugins/chores/identifyChoreAlias'
import { identifyNewChoreDefinitions } from '@/plugins/chores/identifyNewChoreDefinitions'
import { normalizeChore } from '@/plugins/chores/NormalizeChoreTool'
import Queue from 'bull'
import { redisConfig } from './redis'

export type ChoreDefinitionDiscoveryJobData = {
  organizationId: string
  chores: string[]
}

export const choreDefinitionDiscoveryQueue =
  new Queue<ChoreDefinitionDiscoveryJobData>('choreDefinitionDiscovery', {
    redis: redisConfig,
  })

choreDefinitionDiscoveryQueue.process(async (job) => {
  const { chores } = job.data

  const newChores = await identifyNewChoreDefinitions(chores)

  if (newChores.length === 0) return { inserted: 0 }

  // For each new chore, check if it's actually an alias of an existing sized definition
  const withAlias = await Promise.all(
    newChores.map(async (name) => {
      const aliasOfId = await identifyChoreAlias(name).catch((err) => {
        console.error(`choreDefinitionDiscovery: alias check failed for "${name}"`, err)
        return null
      })
      return { name, aliasOfId }
    }),
  )

  const repo = postgres.getRepository(ChoreDefinition)

  // Insert only; skip on unique-name conflict so concurrent jobs are safe
  await repo
    .createQueryBuilder()
    .insert()
    .into(ChoreDefinition)
    .values(withAlias.map(({ name, aliasOfId }) => ({ name, size: null, aliasOfId: aliasOfId ?? null })))
    .orIgnore()
    .execute()

  // Reload the inserted definitions (orIgnore means identifiers may be empty for conflicts)
  const inserted = await repo.find({
    where: newChores.map((name) => ({ name })),
  })

  console.log(
    `choreDefinitionDiscovery: inserted ${inserted.length} new definition(s)`,
  )

  // Embed each new definition (normalize name → embed → store), fire-and-forget
  Promise.all(
    inserted.map(async (def) => {
      try {
        const normalized = await normalizeChore(def.name)
        const embedding = await embedQwen(normalized)
        await setChoreDefinitionEmbedding(def.id, embedding)
      } catch (err) {
        console.error(
          `choreDefinitionDiscovery: failed to embed definition "${def.name}"`,
          err,
        )
      }
    }),
  ).catch(() => {})

  // Send Discord vote messages for any that don't already have one
  const voteMonitor = (await waitForAtlasPlugins()).choreDefinitionVoteMonitor
  if (voteMonitor && inserted.length > 0) {
    voteMonitor
      .sendVoteMessages(inserted)
      .catch((err) =>
        console.error('choreDefinitionDiscovery: sendVoteMessages error', err),
      )
  }

  return { inserted: inserted.length, names: newChores }
})
