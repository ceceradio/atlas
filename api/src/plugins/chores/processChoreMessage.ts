import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { rateChoreDifficultySequential } from './rateChoreDifficultySequential'
import { choreSplitter } from './choreSplitter'
import { DatedRatedChores } from './ChoreTypes'
import { dateSplitter } from './dateSplitter'
import { isChoreMessage } from './isChoreMessage'

const MAX_RETRIES = 4

export async function processChoreMessage(
  message: string,
  date: string,
  tracer?: ITracer,
  _retries = 0,
): Promise<DatedRatedChores[] | null> {
  if (_retries >= MAX_RETRIES) {
    console.error(`processChoreMessage: max retries (${MAX_RETRIES}) exceeded`)
    return null
  }

  try {
    if (!(await isChoreMessage(message, tracer))) return null

    // Step 1: Split the message into dated chore messages
    const datedChoreMessage = await dateSplitter(message, date, tracer)

    const choreRatings: DatedRatedChores[] = []
    // Step 2: For each dated chore message, rate the difficulty of the chores
    for (const datedChore of datedChoreMessage) {
      const chores = await choreSplitter(datedChore, tracer)
      console.log(chores)
      const ratedChores = await rateChoreDifficultySequential(chores, tracer)
      console.log(ratedChores)
      choreRatings.push(ratedChores)
    }
    console.log(JSON.stringify(choreRatings, undefined, 2))

    return choreRatings
  } catch (err) {
    if (err instanceof TypeError) {
      console.warn(
        `processChoreMessage: TypeError on attempt ${
          _retries + 1
        }, retrying...`,
        err.message,
      )
      return processChoreMessage(message, date, tracer, _retries + 1)
    }
    throw err
  }
}
