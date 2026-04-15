import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { Atlas } from '@/atlas/Atlas'
import { postgres } from '@/data-source'
import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { magi } from '@/lib/magi'
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

async function buildSystemMessage(): Promise<string> {
  const definitions = await postgres
    .getRepository(ChoreDefinition)
    .createQueryBuilder('def')
    .where('def.size IS NOT NULL')
    .orderBy('def.name', 'ASC')
    .getMany()

  // Group by size in canonical order
  const bySize = new Map<ChoreDifficulty, string[]>()
  for (const size of SIZE_ORDER) bySize.set(size, [])
  for (const def of definitions) {
    if (def.size) bySize.get(def.size)?.push(def.name)
  }

  const exampleSections = SIZE_ORDER.map((size) => {
    const entries = bySize.get(size) ?? []
    if (entries.length === 0) return ''
    const bullets = entries.map((name) => `- "${name}": ${size}`).join('\n')
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


# Tool call examples

Input: "cleaned the stovetop"
Output: "small"

Input: "did the laundry for the green bathroom"
Output: "medium"

Input: "took out the trash"
Output: "small"

Input: "reloaded small dishwasher"
Output: "small"

Input: "loaded and ran dishwasher"
Output: "medium"

Input: "cooked dinner"
Output: "large"

Input: "unloaded the dishwasher"
Output: "small"

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
  const systemMessage = await buildSystemMessage()
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
