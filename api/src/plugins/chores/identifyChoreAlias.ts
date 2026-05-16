import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { Atlas } from '@/atlas/Atlas'
import { ITool } from '@/atlas/IAtlas'
import { magi } from '@/lib/magi'
import { ChoreAliasCheckTool } from './ChoreAliasCheckTool'
import { findClosestChoreDefinitions } from './choreDefinitionEmbeddings'
import { normalizeChore } from './NormalizeChoreTool'

const TRIALS = 5
const REQUIRED_AGREEMENTS = 3

type IsAliasArgs = { isAlias: boolean }

const IsAliasTool: ITool<IsAliasArgs> = {
  name: 'IsAlias',
  description:
    'Confirm whether the candidate chore is truly an alias of the selected definition.',
  arguments: {
    type: 'object',
    properties: {
      isAlias: {
        type: 'boolean',
        description:
          'true if the chore describes the exact same underlying task as the definition (just worded differently). false if there is any meaningful difference in the task being described.',
      },
    },
    required: ['isAlias'],
  },
  call: async (_req, _res, value) => value,
}

function buildSelectionSystemMessage(
  candidates: Array<{ id: string; name: string }>,
): string {
  const list = candidates
    .map((c) => `- id: ${c.id}  name: "${c.name}"`)
    .join('\n')
  return `You are determining whether a chore is an alias of an existing chore definition.

An alias means the chore describes the **exact same underlying task** as the definition, just worded differently. Minor phrasing differences are fine — what matters is whether a person performing the chore would be doing the identical activity.

# Rules

- Only mark as an alias if the tasks are genuinely identical in scope and activity.
- If the chore is a specific instance of a broader definition (e.g. "vacuumed the green bathroom" vs "vacuumed [any room]"), that is handled elsewhere — do not return an alias for these.
- If the chore adds or removes a meaningfully different activity, it is NOT an alias.
- If none of the candidates match, return aliasOfId as null.

# Examples of aliases

- "put fresh bags in the garage cans" → "tied off and rebagged any amount of garage can(s)"
- "hand washed some dishes" → "hand washed dishes"
- "ran the washing machine" → "did laundry"
- "wiped down bathroom counters" → "wiped down the bathroom sink" ← only if the definition covers the counter area too

# Examples that are NOT aliases

- "took out the recycling" vs "took out the trash" — different waste streams
- "deep cleaned the bathroom" vs "cleaned the bathroom" — meaningfully different scope
- "cooked a full thanksgiving meal" vs "cooked dinner" — different scale

# Candidate definitions

${list}

Return the id of the matching definition, or null if none apply.`
}

function buildConfirmationSystemMessage(
  choreName: string,
  definitionName: string,
): string {
  return `You are confirming whether two chore descriptions refer to the exact same underlying task.

Chore: "${choreName}"
Definition: "${definitionName}"

An alias means a person performing one would be doing the identical activity as the other — just described with different words.
Answer true only if you are confident they describe the same task. Answer false if there is any meaningful difference.`
}

/**
 * Given a chore that has already been determined to be "new" (not covered by existing
 * definitions), check whether it is actually an alias of an existing sized canonical
 * definition — i.e. the same task described differently.
 *
 * Returns the aliasOfId string if confirmed, null if it is genuinely a new distinct chore.
 */
export async function identifyChoreAlias(
  chore: string,
  tracer?: ITracer,
): Promise<string | null> {
  const normalizedForm = await normalizeChore(chore, tracer).catch(() => chore)

  // Embed both forms and union the closest candidates
  const [choreEmbedding, normalizedEmbedding] = await Promise.all([
    embedQwen(chore),
    embedQwen(normalizedForm),
  ])

  const [choreMatches, normalizedMatches] = await Promise.all([
    findClosestChoreDefinitions(choreEmbedding),
    findClosestChoreDefinitions(normalizedEmbedding),
  ])

  // Dedupe by id, keeping highest similarity
  const candidateMap = new Map<
    string,
    { id: string; name: string; similarity: number }
  >()
  for (const m of [...choreMatches, ...normalizedMatches]) {
    const existing = candidateMap.get(m.id)
    if (!existing || m.similarity > existing.similarity)
      candidateMap.set(m.id, m)
  }
  const candidates = [...candidateMap.values()]
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 16)

  if (candidates.length === 0) return null

  // Pass 1: ask AI to pick the best alias candidate
  const selectionSystemMessage = buildSelectionSystemMessage(candidates)
  let selected: { aliasOfId: string | null }
  try {
    selected = await Atlas.processToolRequest(
      ChoreAliasCheckTool,
      selectionSystemMessage,
      [`Chore: "${chore}"\nNormalized: "${normalizedForm}"`],
      undefined,
      tracer,
    )
  } catch (err) {
    console.warn(`identifyChoreAlias: selection failed for "${chore}"`, err)
    return null
  }

  if (!selected.aliasOfId) return null

  const pickedCandidate = candidateMap.get(selected.aliasOfId)
  if (!pickedCandidate) return null

  // Pass 2: magi consensus to confirm the selected alias
  const confirmationSystemMessage = buildConfirmationSystemMessage(
    chore,
    pickedCandidate.name,
  )
  try {
    const confirmed = await magi(
      () =>
        Atlas.processToolRequest(
          IsAliasTool,
          confirmationSystemMessage,
          [`Is "${chore}" an alias of "${pickedCandidate.name}"?`],
          undefined,
          tracer,
        ).then((r) => r.isAlias),
      REQUIRED_AGREEMENTS,
      TRIALS,
    )

    if (!confirmed) {
      console.debug(
        `identifyChoreAlias: "${chore}" → "${pickedCandidate.name}" rejected by confirmation`,
      )
      return null
    }

    console.debug(
      `identifyChoreAlias: "${chore}" confirmed as alias of "${pickedCandidate.name}" (${pickedCandidate.id})`,
    )
    return selected.aliasOfId
  } catch (err) {
    console.warn(`identifyChoreAlias: confirmation failed for "${chore}"`, err)
    return null
  }
}
