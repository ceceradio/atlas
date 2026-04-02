import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { Atlas } from '@/atlas/Atlas'
import { ChoreRaterTool } from './ChoreRaterTool'
import { DatedChores, DatedRatedChores } from './ChoreTypes'

export async function choreDifficultyRater(
  input: DatedChores,
  tracer?: ITracer,
): Promise<DatedRatedChores> {
  const systemMessage = `You are a helpful assistant that reads a list of chores that someone did, and rates the difficulty of each chore as small, medium, or large. Some chores listed are not actually chores, and those should be rated as "not a chore".
The difficulty should be rated based on the amount of time and effort it would take to complete the chore, as well as the level of skill required.
When you see a chore that is not included in the lists below, use your understanding of the chore to rate its difficulty.

# Examples

## Not a chore

- "moved my stuff out of [any room]": not a chore
- "put away drying rack dishes": not a chore
- "refilled soap in bathroom": not a chore
- "replaced toilet paper": not a chore
- "replaced paper towels": not a chore
- "refilled matches/air freshener": not a chore

## Small

- "cleaned the kitchen countertops": small
- "rinsed the kitchen sink": small
- "unloaded the dishwasher": small
- "partially loaded the dishwasher": small
- "wiped down the bathroom sink": small
- "cleaned the stovetop": small
- "quickly wet swiffed [any room]": small
- "quickly vacuumed [any room]": small
- "vacuumed second floor hallway": small
- "took out [any room] trash": small
- "tied off and rebagged any amount of garage can(s)": small
- "took trash out to curb": small
- "put away groceries": small
- "replaced air filter": small
- 

## Medium

- "thoroughly cleaned the kitchen sink": medium
- "did the laundry for [kitchen/any bathroom]": medium
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
`
  const { chores } = await Atlas.processToolRequest(
    ChoreRaterTool,
    systemMessage,
    [JSON.stringify({ chores: input.chores }, undefined, 2)],
    undefined,
    tracer,
  )
  return {
    date: input.date,
    chores,
  }
}
