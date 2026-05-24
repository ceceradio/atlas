import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { Atlas } from '@/atlas/Atlas'
import { postgres } from '@/data-source'
import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { magi } from '@/lib/magi'
import { selectMultipleFromList } from '@/subfunctions/selectMultipleFromList'
import {
  EmbeddingMatch,
  findClosestChoreDefinitions,
} from './choreDefinitionEmbeddings'
import {
  ChoreDifficulty,
  DatedChores,
  DatedRatedChores,
  RatedChore,
} from './ChoreTypes'
import { SingleChoreRaterTool } from './SingleChoreRaterTool'

const TRIALS = 3
const REQUIRED_AGREEMENTS = 2

const SIZE_ORDER: ChoreDifficulty[] = [
  'not a chore',
  'small',
  'medium',
  'large',
  'extra large',
]

const SIZE_HEADINGS: Record<ChoreDifficulty, string> = {
  'not a chore': 'Not a chore',
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
  'extra large': 'Extra large',
}

async function buildSystemMessage(
  closestMatches?: EmbeddingMatch[],
): Promise<string> {
  const definitions = await postgres
    .getRepository(ChoreDefinition)
    .createQueryBuilder('def')
    .where('def.size IS NOT NULL OR def.aliasOfId IS NOT NULL')
    .orderBy('def.name', 'ASC')
    .getMany()

  const canonicals = definitions.filter((d) => d.aliasOfId === null && d.size)
  const aliasesByParentId = new Map<string, string[]>()
  for (const def of definitions) {
    if (def.aliasOfId) {
      const list = aliasesByParentId.get(def.aliasOfId) ?? []
      list.push(def.name)
      aliasesByParentId.set(def.aliasOfId, list)
    }
  }

  // Group canonicals by size in canonical order
  const bySize = new Map<ChoreDifficulty, ChoreDefinition[]>()
  for (const size of SIZE_ORDER) bySize.set(size, [])
  for (const def of canonicals) {
    if (def.size) bySize.get(def.size)?.push(def)
  }

  const exampleSections = SIZE_ORDER.map((size) => {
    const entries = bySize.get(size) ?? []
    if (entries.length === 0) return ''
    const bullets = entries.map((def) => {
      const aliases = aliasesByParentId.get(def.id)
      const aliasList = aliases?.length
        ? '\n' + aliases.map((a) => `  - "${a}": ${size}`).join('\n')
        : ''
      return `- "${def.name}": ${size}${aliasList}`
    }).join('\n')
    return `## ${SIZE_HEADINGS[size]}\n\n${bullets}`
  })
    .filter(Boolean)
    .join('\n\n')

  return `You are a helpful assistant that reads a single chore that someone did, and rates its difficulty as small, medium, large, or extra large. If the item is not actually a chore, rate it as "not a chore".
The difficulty should be rated based on the amount of time and effort it would take to complete the chore, as well as the level of skill required.
When you see a chore that is not included in the lists below, use your understanding of the chore to rate its difficulty.

Chores that have square brackets like [this room, that room] mean that the chore could be performed in any of those rooms, and the difficulty rating should apply to each of those.
Some rooms are bigger than others, so some rooms are medium difficulty to vacuum, and others are small difficulty.

# Examples

${exampleSections}

# Closest matches

Below is a list of existing chore definitions that are closest to the input chore based on their embeddings.
Use this information as context, but don't rely on it too much — the existing chore with the closest embedding might not actually be that similar to the input chore, and there might be important differences that affect the difficulty rating.

${
  closestMatches
    ? closestMatches
        .map((closestMatch) =>
          closestMatch
            ? `"${closestMatch.name}": ${closestMatch.size} difficulty.`
            : '',
        )
        .join('\n')
    : ''
}

`
}

export async function rateChoreDifficultySequential(
  input: DatedChores,
  tracer?: ITracer,
): Promise<DatedRatedChores> {
  const rated = await Promise.all(
    input.chores.map(async (chore): Promise<RatedChore> => {
      const difficulty = await magiRateChoreDifficulty(chore, tracer)
      return { chore, difficulty }
    }),
  )

  return {
    date: input.date,
    chores: rated,
  }
}

export async function magiRateChoreDifficulty(
  chore: string,
  tracer?: ITracer,
): Promise<ChoreDifficulty> {
  const embedding = await embedQwen(chore)
  const closestMatches = await findClosestChoreDefinitions(embedding, 10)
  // select the closest match for real
  const closestMatchNames = await selectMultipleFromList(
    closestMatches.map((m) => m.name),
    chore,
    `Pick the items from the list that are similar to, or describe, the input item.

# Examples of matches

Input: "vacuumed the living room"
Matches:
- "vacuuming the living room"
- "vacuuming [living room, game room]"
- "thoroughly vacuumed the living room"

Input: "loady dishes"
Matches:
- "loading the dishwasher"

Input: "kitchen trash"
Matches:
- "take out kitchen trash"
- "take out [any room] trash"    `,
    tracer,
  )
  const closestMatchesFiltered = closestMatches.filter((m) =>
    closestMatchNames.includes(m.name),
  )

  const systemMessage = await buildSystemMessage(
    closestMatchesFiltered.length > 0 ? closestMatchesFiltered : undefined,
  )
  const difficulty = await magi(
    async () => {
      const result = await Atlas.processToolRequest(
        SingleChoreRaterTool,
        systemMessage,
        [chore],
        undefined,
        tracer,
      )
      return result.difficulty
    },
    REQUIRED_AGREEMENTS,
    TRIALS,
  )
  return difficulty
}
