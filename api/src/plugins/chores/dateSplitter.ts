import { Atlas } from '@/atlas/Atlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { DatedChoresRaw } from './ChoreTypes'
import { DateSplitterTool } from './DateSplitterTool'

export async function dateSplitter(
  text: string,
  messageDate: string,
  tracer?: ITracer,
): Promise<DatedChoresRaw[]> {
  const systemMessage = `You are a helpful assistant that reads a message describing chores that were done, and splits the message up into which day the chores were performed on.

The message will frequently be only about chores that were done in the past, but may also include chores that will be done in the future.
The output should be an array where the message has been split into parts that each correspond to a single day.

Generally speaking most people go to sleep before midnight, but sometimes there are some very late night chores done.
Chores done after midnight but before 4am should be considered as being done the previous day, since they are likely being done by someone who has not yet gone to sleep.

## Examples

Date Input: 2026-03-21T19:02:38.183Z
Text Input: "I cleaned the kitchen yesterday and will do the laundry today"
Output: [
  {
    date: "2026-03-20",
    message: "I cleaned the kitchen yesterday"
  },
  {
    date: "2026-03-21",
    message: "will do the laundry today"
  }
]

Date Input: 2026-02-01T00:02:38.183Z
Text Input: "I did handwashed pots and pans from dinner, and cleaned the countertops and stovetop late at night."
Output: [
  {
    date: "2026-01-31",
    message: "I did handwashed pots and pans from dinner, and cleaned the countertops and stovetop late at night."
  },
]

Date Input: 2026-01-03T09:02:38.183Z
Text Input: "I cleaned the bathroom sink and toilet yesterday, and will clean the kitchen sink later today."
Output: [
  {
    date: "2026-01-02",
    message: "I cleaned the bathroom sink and toilet yesterday"
  },
  {
    date: "2026-01-03",
    message: "will clean the kitchen sink later today"
  }
]

The date the message was sent is ${messageDate}
`
  const response = await Atlas.processToolRequest(
    DateSplitterTool,
    systemMessage,
    [text],
    undefined,
    tracer,
  )
  console.debug('date splitter response', { response })
  return response.splits
}
