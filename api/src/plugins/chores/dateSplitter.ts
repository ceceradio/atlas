import { Atlas } from '@/atlas/Atlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { dateSubtract } from '@/lib/dateAdd'
import { DatedChoresRaw } from './ChoreTypes'
import { DateSplitterTool } from './DateSplitterTool'

const TZ = 'America/New_York'

function toYMD(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getEasternHour(date: Date): number {
  const hour = parseInt(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(date),
  )
  return hour === 24 ? 0 : hour
}

export async function dateSplitter(
  text: string,
  messageDate: string,
  tracer?: ITracer,
): Promise<DatedChoresRaw[]> {
  console.log(messageDate)
  const sentAt = new Date(messageDate)
  const isEarlyMorning = getEasternHour(sentAt) < 4
  const today = isEarlyMorning ? dateSubtract(sentAt, 1, 'day') : sentAt
  const yesterday = dateSubtract(today, 1, 'day')
  const sentAtStr = sentAt.toLocaleString('en-US', {
    timeZone: TZ,
    dateStyle: 'full',
    timeStyle: 'long',
  })
  const systemMessage = `\
You are a helpful assistant that reads a message describing chores and splits it into groups by the day each chore was performed.

## Rules

- The output is an array of splits, one per day mentioned.
- Messages often describe chores done in the past; occasionally they include future intentions — include those too, assigned to the correct date.
- Messages are sent in the Eastern timezone. Times after midnight but before 4am are treated as belonging to the previous calendar day (the sender has not yet gone to sleep).
- Use the original wording from the message in each split — do not paraphrase or summarize.
- If the message contains no temporal references at all, assign everything to today (\`${toYMD(
    today,
  )}\`).
- If the message contains things like 3/5, 4/5, or 5/5 it likely does not refer to dates, but rather to how many people participated in a chore. Do not treat these as dates.

## Context

Message sent: \`${sentAtStr}\`${
    isEarlyMorning
      ? ' *(early morning — treated as the previous calendar day)*'
      : ''
  }
- "today" = \`${toYMD(today)}\`
- "yesterday" = \`${toYMD(yesterday)}\`

## Examples

---

Date: \`Saturday, March 21, 2026 at 7:02:38 PM EDT\`
Input: \`"I cleaned the kitchen yesterday and will do the laundry today"\`
Output:
\`\`\`json
[
  { "date": "2026-03-20", "message": "I cleaned the kitchen yesterday" },
  { "date": "2026-03-21", "message": "will do the laundry today" }
]
\`\`\`

---

Date: \`Sunday, February 1, 2026 at 12:02:38 AM EST\` *(early morning — treated as the previous calendar day)*
- "today" = \`2026-01-31\`, "yesterday" = \`2026-01-30\`
Input: \`"I did handwashed pots and pans from dinner, and cleaned the countertops and stovetop late at night."\`
Output:
\`\`\`json
[
  { "date": "2026-01-31", "message": "I did handwashed pots and pans from dinner, and cleaned the countertops and stovetop late at night." }
]
\`\`\`

---

Date: \`Saturday, March 28, 2026 at 1:15:00 AM EDT\` *(early morning — treated as the previous calendar day)*
- "today" = \`2026-03-27\`, "yesterday" = \`2026-03-26\`
Input: \`"today I cooked dinner and did the dishes, yesterday I vacuumed the living room"\`
Output:
\`\`\`json
[
  { "date": "2026-03-26", "message": "yesterday I vacuumed the living room" },
  { "date": "2026-03-27", "message": "today I cooked dinner and did the dishes" }
]
\`\`\`

---

Date: \`Saturday, January 3, 2026 at 9:02:38 AM EST\`
Input: \`"I cleaned the bathroom sink and toilet yesterday, and will clean the kitchen sink later today."\`
Output:
\`\`\`json
[
  { "date": "2026-01-02", "message": "I cleaned the bathroom sink and toilet yesterday" },
  { "date": "2026-01-03", "message": "will clean the kitchen sink later today" }
]
\`\`\`

---

Date: \`Tuesday, March 3, 2026 at 9:02:38 PM EST\`
Input:
\`\`\`
yesterday:
- cooked dinner for 3/5 (also cleaned up afterwards, put leftovers in fridge)
- took trash out to curb

today i:

- cleaned the bathroom sink and toilet
- will clean the kitchen sink later today
\`\`\`
Output:
\`\`\`json
[
  { "date": "2026-03-02", "message": "yesterday:\n- cooked dinner for 3/5 (also cleaned up afterwards, put leftovers in fridge)\n- took trash out to curb" },
  { "date": "2026-03-03", "message": "today i:\n\n- cleaned the bathroom sink and toilet\n- will clean the kitchen sink later today" }
]
\`\`\`

---

Date: \`Tuesday, May 19, 2026 at 9:02:38 PM EDT\`
Input:
\`\`\`
today i:
- cooked dinner for 3/5 (also cleaned up afterwards, put leftovers in fridge)
- took trash out to curb
- cleaned the bathroom sink and toilet
- will clean the kitchen sink later today
\`\`\`
Output:
\`\`\`json
[
  { "date": "2026-05-19", "message": "today i:\n- cooked dinner for 3/5 (also cleaned up afterwards, put leftovers in fridge)\n- took trash out to curb\n- cleaned the bathroom sink and toilet\n- will clean the kitchen sink later today" }
]
\`\`\`

---

Date: \`Tuesday, May 19, 2026 at 10:30:00 PM EDT\`
Input:
\`\`\`
Today:
Cleared a bunch of old food out of the fridge
PBR Trash
Re-bagged Bin
\`\`\`
Output:
\`\`\`json
[
  { "date": "2026-05-19", "message": "Today:\n- Cleared a bunch of old food out of the fridge\n- PBR Trash\n- Re-bagged Bin" }
]
\`\`\`

---

Date: \`Thursday, April 10, 2026 at 3:15:00 PM EDT\`
Input: \`"vacuumed the living room and took out the trash"\`
Output:
\`\`\`json
[
  { "date": "2026-04-10", "message": "vacuumed the living room and took out the trash" }
]
\`\`\`

Call the tool exactly once.
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
