import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { Atlas } from '@/atlas/Atlas'
import { magi } from '@/lib/magi'
import { DatedChores, DatedRatedChores, RatedChore } from './ChoreTypes'
import { SingleChoreRaterTool } from './SingleChoreRaterTool'

const TRIALS = 3
const REQUIRED_AGREEMENTS = 2

const systemMessage = `You are a helpful assistant that reads a single chore that someone did, and rates its difficulty as small, medium, large, or extra large. If the item is not actually a chore, rate it as "not a chore".
The difficulty should be rated based on the amount of time and effort it would take to complete the chore, as well as the level of skill required.
When you see a chore that is not included in the lists below, use your understanding of the chore to rate its difficulty.

Chores that have square brackets like [this room, that room] mean that the chore could be performed in any of those rooms, and the difficulty rating should apply to each of those.
Some rooms are bigger than others, so some rooms are medium difficulty to vacuum, and others are small difficulty.

# Examples

## Not a chore

- "moved my stuff out of [any room]": not a chore
- "refilled soap in bathroom": not a chore
- "replaced toilet paper": not a chore
- "replaced paper towels": not a chore
- "refilled matches/air freshener": not a chore

## Small

- "put away drying rack dishes": small
- "cleaned the kitchen countertops": small
- "rinsed the kitchen sink": small
- "unloaded the dishwasher": small
- "partially loaded the dishwasher": small
- "wiped down the bathroom sink": small
- "cleaned the stovetop": small
- "quickly wet swiffed [any room]": small
- "quickly vacuumed [any room]": small
- "vacuumed second [hallway, any stairway, any stairway landing, any entryway]": small
- "took out [any room] trash": small
- "tied off and rebagged any amount of garage can(s)": small
- "took trash out to curb": small
- "put away groceries": small
- "replaced air filter": small

## Medium

- "thoroughly cleaned the kitchen sink": medium
- "did the (towel/wetswiff/other?) laundry for [kitchen/any bathroom]": medium
- "wetswiffed the [green bathroom, pink bathroom, second floor hallway, narrow stairway, grand stairway, grand stairway landing]": medium
- "wet swiffed the second floor hallway": medium
- "thoroughly cleaned the bathroom sink": medium
- "cleaned scrubbed the inside of the toilet bowl": medium
- "vacuumed [kitchen, living room, green room, game room, utility room]": medium
- "threw out leftovers from the fridge": medium
- "replaced a water filter": medium
- "cleaned the microwave": medium
- "ordered groceries": medium
- "hand washed pots/pans": medium
- "spread salt on the sidewalks/driveway": medium
- "reorganized [a small area such as a cabinet, countertop, or shelf]": medium

## Large

- "cooked dinner": large
- "cleaned the toilet thoroughly": large
- "cleaned the tub/shower": large
- "wet swiffed the [kitchen/living room/utility room]": large
- "thoroughly vacuumed [any room]": large
- "thoroughly cleaned [any appliance]": large
- "picked up trash around the yard": large
- "mowed the lawn": large
- "snow blowed/shoveled": large
- "repaired [any appliance/furniture/fixture]": large
- "reorganized [a large area like a room]": large

## Extra large

- "deep cleaned the kitchen (counters, sink, stovetop, microwave, appliances)": extra large
- "deep cleaned the [any bathroom] (toilet, tub/shower, sink, floor, mirrors)": extra large
- "thoroughly cleaned the entire [any room] top to bottom": extra large
- "cooked a large meal/feast for the household": extra large
- "grocery shopped and put away a full grocery order": extra large
- "completed a major home repair or installation": extra large
- "reorganized or cleaned out the entire garage/basement/attic": extra large
- "did a full house clean/tidy": extra large


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

export async function rateChoreDifficultySequential(
  input: DatedChores,
  tracer?: ITracer,
): Promise<DatedRatedChores> {
  const rated = await Promise.all(
    input.chores.map(async (chore): Promise<RatedChore> => {
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
      return { chore, difficulty }
    }),
  )

  return {
    date: input.date,
    chores: rated,
  }
}
