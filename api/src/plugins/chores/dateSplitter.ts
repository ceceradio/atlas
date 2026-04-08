import { Atlas } from '@/atlas/Atlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { dateSubtract } from '@/lib/dateAdd'
import { DatedChoresRaw } from './ChoreTypes'
import { DateSplitterTool } from './DateSplitterTool'

const TZ = process.env.TZ ?? 'America/New_York'

function toYMD(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getLocalHour(date: Date): number {
  return parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: 'numeric',
      hour12: false,
    }).format(date),
  )
}

export async function dateSplitter(
  text: string,
  messageDate: string,
  tracer?: ITracer,
): Promise<DatedChoresRaw[]> {
  console.log(messageDate)
  const sentAt = new Date(messageDate)
  const isEarlyMorning = getLocalHour(sentAt) < 4
  const today = isEarlyMorning ? dateSubtract(sentAt, 1, 'day') : sentAt
  const yesterday = dateSubtract(today, 1, 'day')
  const systemMessage = `You are a helpful assistant that reads a message describing chores that were done, and splits the message up into which day the chores were performed on.

The message will frequently be only about chores that were done in the past, but may also include chores that will be done in the future.
The output should be an array where the message has been split into parts that each correspond to a single day.

Generally speaking most people go to sleep before midnight, but sometimes there are some very late night chores done.
Chores done after midnight but before 4am should be considered as being done the previous day, since they are likely being done by someone who has not yet gone to sleep.

## Examples

Date Input: 2026-03-21 7:02:38 PM EST
Text Input: "I cleaned the kitchen yesterday and will do the laundry today"
Tool call: DateSplitter({ "splits": [
  { "date": "2026-03-20", "message": "I cleaned the kitchen yesterday" },
  { "date": "2026-03-21", "message": "will do the laundry today" }
]})

Date Input: 2026-02-01 12:02:38 AM EST
Text Input: "I did handwashed pots and pans from dinner, and cleaned the countertops and stovetop late at night."
Tool call: DateSplitter({ "splits": [
  { "date": "2026-01-31", "message": "I did handwashed pots and pans from dinner, and cleaned the countertops and stovetop late at night." }
]})

Date Input: 2026-01-03 09:02:38 AM EST
Text Input: "I cleaned the bathroom sink and toilet yesterday, and will clean the kitchen sink later today."
Tool call: DateSplitter({ "splits": [
  { "date": "2026-01-02", "message": "I cleaned the bathroom sink and toilet yesterday" },
  { "date": "2026-01-03", "message": "will clean the kitchen sink later today" }
]})

Date Input: 2026-03-03 09:02:38 PM EST
Text Input: "yesterday:
- cooked dinner for 3/5 (also cleaned up afterwards, put leftovers in fridge)
- took trash out to curb

today i:

- cleaned the bathroom sink and toilet
- will clean the kitchen sink later today"
Tool call: DateSplitter({ "splits": [
  { "date": "2026-03-02", "message": "yesterday:\n- cooked dinner for 3/5 (also cleaned up afterwards, put leftovers in fridge)\n- took trash out to curb" },
  { "date": "2026-03-03", "message": "today i:\n\n- cleaned the bathroom sink and toilet\n- will clean the kitchen sink later today" }
]})

Date Input: 2026-05-19 09:02:38 PM EST
Text Input: "today i:
- cooked dinner for 3/5 (also cleaned up afterwards, put leftovers in fridge)
- took trash out to curb
- cleaned the bathroom sink and toilet
- will clean the kitchen sink later today"
Tool call: DateSplitter({ "splits": [
  { "date": "2026-05-19", "message": "today i:\n- cooked dinner for 3/5 (also cleaned up afterwards, put leftovers in fridge)\n- took trash out to curb\n- cleaned the bathroom sink and toilet\n- will clean the kitchen sink later today" }
]})

Date Input: 2026-05-19 10:30:00 PM EST
Text Input: "Today:
Cleared a bunch of old food out of the fridge
PBR Trash
Re-bagged Bin"
Tool call: DateSplitter({ "splits": [
  { "date": "2026-05-19", "message": "Today:\n- Cleared a bunch of old food out of the fridge\n- PBR Trash\n- Re-bagged Bin" }
]})

The date the message was sent is ${sentAt.toLocaleString('en-US', {
    timeZone: TZ,
  })}${
    isEarlyMorning
      ? ` (early morning — treated as the previous calendar day for chore purposes)`
      : ''
  }. Therefore "today" would mean ${toYMD(
    today,
  )}, "yesterday" would mean ${toYMD(yesterday)}

Call the tool exactly one time.
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
