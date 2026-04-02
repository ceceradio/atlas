import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { choreDifficultyRater } from './choreDifficultyRater'
import { choreSplitter } from './choreSplitter'
import { DatedRatedChores } from './ChoreTypes'
import { dateSplitter } from './dateSplitter'

export async function processChoreMessage(
  message: string,
  date: string,
  tracer?: ITracer,
): Promise<DatedRatedChores[]> {
  // Step 1: Split the message into dated chore messages
  const datedChoreMessage = await dateSplitter(message, date, tracer)
  console.log(datedChoreMessage)
  const choreRatings: DatedRatedChores[] = []
  // Step 2: For each dated chore message, rate the difficulty of the chores
  for (const datedChore of datedChoreMessage) {
    const chores = await choreSplitter(datedChore, tracer)
    console.log(chores)
    const ratedChores = await choreDifficultyRater(chores, tracer)
    console.log(ratedChores)
    choreRatings.push(ratedChores)
  }
  console.log(JSON.stringify(choreRatings, undefined, 2))

  return choreRatings
}
