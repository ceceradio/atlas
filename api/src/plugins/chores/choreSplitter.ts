import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { Atlas } from '@/atlas/Atlas'
import { getDataSource } from '@/data-source'
import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { splitIntoChunks } from '@/subfunctions/splitIntoChunks'
import pgvector from 'pgvector'
import { Brackets } from 'typeorm'
import { applyChoreAuditChanges, ChoreAuditorTool } from './ChoreAuditorTool'
import { ChoreSplitterTool } from './ChoreSplitterTool'
import { DatedChores, DatedChoresRaw } from './ChoreTypes'

export const commonShortnames = {
  gbr: 'green bathroom',
  pbr: 'pink bathroom',
  livvy: 'living room',
  '2f': 'second floor',
  'red room': 'front entryway',
  cans: 'can recycling',
  'small recyclies': 'small recycling',
  'big recyclies': 'big recycling',
  gronks: 'groceries',
  gronkeries: 'groceries',
  loady: 'loaded the dishwasher',
  'small loady': 'partially loaded the dishwasher',
  'partial load': 'partially loaded the dishwasher',
  'food prep counters': 'spice countertop and microwave countertop',
}

export const commonShortnamePrompt = `# Shortnames

Chores are generally performed in certain areas of the house, or objects in the house, and those areas often have shortnames. For example, "gbr" is a common shortname for "green bathroom."
Here are some common shortnames and their corresponding full names:
${Object.entries(commonShortnames)
  .map(([shortname, fullName]) => `- ${shortname}: ${fullName}`)
  .join('\n')}

When you see a shortname in the input, replace it with the full name in the output. For example, if the input is "cleaned the gbr", the output should be "cleaned the green bathroom".`

async function buildChoreDefinitionsMessage(
  input: DatedChoresRaw,
): Promise<string> {
  try {
    const db = await getDataSource()
    const chunks = await splitIntoChunks(input.message)

    const DISTANCE_THRESHOLD = 0.3
    const defsQuery = db
      .getRepository(ChoreDefinition)
      .createQueryBuilder('def')
      .where(
        "((def.size IS NOT NULL AND def.size != 'not a chore') OR def.aliasOfId IS NOT NULL)",
      )
      .orderBy('def.name', 'ASC')
      .andWhere(
        new Brackets((qb) => {
          let i = 1
          for (const chunk of chunks) {
            qb.orWhere(
              `def.embedding IS NOT NULL AND (def.embedding <=> :param${i}) < ${DISTANCE_THRESHOLD}`,
              { [`param${i}`]: pgvector.toSql(chunk.embedding) },
            )
            i++
          }
        }),
      )

    const defs = await defsQuery.getMany()

    if (defs.length === 0) return ''

    const canonicals = defs.filter((d) => d.aliasOfId === null)
    const aliasesByCanonical = new Map<string, string[]>()
    for (const d of defs) {
      if (d.aliasOfId) {
        const list = aliasesByCanonical.get(d.aliasOfId) ?? []
        list.push(d.name)
        aliasesByCanonical.set(d.aliasOfId, list)
      }
    }

    const lines = canonicals.map((c) => {
      const aliases = aliasesByCanonical.get(c.id)
      return aliases?.length
        ? `- ${c.name} (also known as: ${aliases.join(', ')})`
        : `- ${c.name}`
    })

    return `# Known Chore Names

The following chore names are already recognized in this household and may be relevant.
When you output chore descriptions, prefer using these exact names if they exist, but if not, then copy what the user has written minus the time of day or other superfluous details.
Often people will report chores using different words than the chore definition does, but if they mean the exact same thing, it's preferred to use the chore definition.
However, if the user input seems to be describing a chore that is meaningfully different than any of the existing chore definitions, then it's better to output a new chore description that matches the user's wording, since it doesn't match the existing chore definitions.
An example would be, "threw out pizza boxes from karaoke night" — there probably is no existing chore definition for this exact task, so output: ["threw out pizza boxes from karaoke night"], even if there is an existing chore definition for "took out the trash" that this could be considered an instance of. On the other hand, if the input is "took out the pink bathroom trash and the kitchen trash", then it's better to output ["took out the pink bathroom trash", "took out the kitchen trash"] rather than trying to use an existing chore definition, because the user's wording is already pretty close to the existing chore definitions, and it seems like they are intentionally describing two separate chores. The goal is to strike a balance between using existing chore definitions when they are a good fit, but also being flexible and understanding the user's intent when their wording doesn't quite match any existing chore definitions.

${lines.join('\n')}`
  } catch {
    return ''
  }
}

export async function choreSplitter(
  input: DatedChoresRaw,
  tracer?: ITracer,
): Promise<DatedChores> {
  const choreDefinitionsMessage = await buildChoreDefinitionsMessage(input)
  const systemMessage = `You are a helpful assistant that reads a message reporting the chores that someone did, and splits the message into individual chores as an array of strings. The goal is to capture as many distinct chores as possible without being overly granular. Examples are provided to guide you; however, this is a task that requires careful consideration of context and nuances.

# How to Split Chores

Chore splitting is an important process that breaks down a message describing chores into its individual chore components. By splitting chores accurately, you set up the chore rater to give more precise ratings for each distinct chore, which leads to a more accurate and fair tally of chore performance. Accuracy is important, so it's best to split chores into more items rather than fewer, and to try to capture each bit of the text of the original message. The chore rater can decide to rate a chore as "not a chore" so there is no harm in splitting chores into more granular items. If you fail to split out the correct chores, then the chore rater won't be able to rate some chores individually, and that is a failure of the chore splitter.

Chores could be provided in a list format, in a paragraph format, or mixed. Even in a list format, two or more chores could be in a single list item, or a single chore could be split across multiple list items. A message could have 3 bullet points, but there could be 10 or more chores described in those 3 bullet points. Try to split every chore message out into as many separate chores as necessary.

Chores like vacuuming, wet swiffing, cleaning, and doing laundry are often performed in multiple rooms in the same day, and those should be split into separate chores for each room. For example, "vacuumed the grand stairway, kitchen, pink bathroom, and 2nd floor hallway" should be split into ["vacuumed the grand stairway", "vacuumed the kitchen", "vacuumed the pink bathroom", "vacuumed the 2nd floor hallway"].

Some chores are combined on one line like "took out cans and small recycling." In that case, you should split that into two chores: "took out can recycling" and "took out small recycling" since they are separate bags/bins and take extra effort to carry down together, or may also have been done at different times.

# Examples

Here are some examples of how to split chores:

**Input:** I cleaned the kitchen countertops and Dusted lint dust from washer and dryer, gave dryer a quick lint brushing, and wiped a lil scummy buildup from inside of washer door.
**Tool call:** { "chores": ["cleaned the kitchen countertop(s)", "partially cleaned the dryer", "partially cleaned the washer"]}

**Input:** I cleaned the spice countertop, microwave countertop, and the sink. I also did the laundry for the pbr.
**Tool call:** { "chores": ["cleaned the kitchen countertop(s)", "cleaned the kitchen sink", "did the laundry for the pink bathroom"]}

**Input:** I wetswiffed the gbr, 2f hallway, and quick vacc'd the livvy and the grand staircase.
**Tool call:** { "chores": ["wetswiffed the green bathroom", "wetswiffed the second floor hallway", "quick vacuumed the living room", "quick vacuumed the grand staircase"]}

**Input:** I cleaned the kitchen countertops, and vacuumed the game room green bathroom, kitchen, narrow stairway grand stairway and practice area
**Tool call:** { "chores": ["cleaned the kitchen countertop(s)", "vacuumed the game room", "vacuumed the green bathroom", "vacuumed the kitchen", "vacuumed the narrow stairway", "vacuumed the grand stairway", "vacuumed the practice area"]}

**Input:** cleaned the kitchen counters, and the game room table. Sprayed down pink shower with cleaner.
**Tool call:** { "chores": ["cleaned the kitchen counters", "cleaned the game room table", "cleaned pink bathroom shower"]}

**Input:** cleaned the kitchen counters, the game room table, and tidied dining room table
**Tool call:** { "chores": ["cleaned the kitchen counters", "cleaned the game room table", "tidied the dining room table"]}

**Input:** Ordered and put away gronks. cleaned the microwave and spice kitchen counters 
**Tool call:** { "chores": ["ordered groceries", "put away groceries", "cleaned the microwave countertop", "cleaned the spice countertop"]}

**Input:** Today, cleaned the kitchen sink and cleaned the silverware tray. Cleaned shelves over the spice counter. Spent over an hour reorganizing the shelves above the spice counter (moved away plastic containers to live with their brethren and shifted items up to reclaim some counter space). Quick clean of counters.
**Tool call:** { "chores": ["cleaned the kitchen sink", "cleaned the silverware tray", "reorganized the shelves above the spice counter", "quick cleaned the kitchen counters"]}

**Input:** Loaded, unloaded, and started the dishwasher. put away drying rack. did the garage cans.
**Tool call:** { "chores": ["loaded the dishwasher", "unloaded the dishwasher", "started the dishwasher", "put away drying rack dishes", "took out the trash", "rebagged the garage cans"]}

**Input:** replaced air filter and vacuumed the unit. small loady morning time
**Tool call:** { "chores": ["replaced air filter", "vacuumed the unit", "partially loaded the dishwasher"]}

**Input:** unloaded the dishwasher (morning), unloaded and loaded the dishwasher (evening), took out cans and recycles
**Tool call:** { "chores": ["unloaded the dishwasher", "unloaded the dishwasher", "loaded the dishwasher", "took out can recycling", "took out small recycling"]}

**Input:** Swept up collected salt, bugs, and dirt from garage floor. vacuumed the narrow and grand stairways. recycle bin in. used drain cleaner in tub drain
**Tool call:** { "chores": ["swept garage floor", "vacuumed the narrow stairway", "vacuumed the grand stairway", "brought the the recycle bin back inside", "cleaned a slow tub drain"]}

**Input:** Today: -Cleared a bunch of old food out of the fridge -PBR Trash -Re-bagged Bin
**Tool call:** { "chores": ["cleared old food out of the fridge", "took out the pink bathroom trash", "re-bagged garage bin"]}

**Input:** Today: - Cooked Dinner - Drying Rack - Hand Washy
**Tool call:** { "chores": ["cooked dinner", "put away drying rack dishes", "hand washed dishes"]}

**Input:** Yesterday I:
• unloaded the dishwasher (morning), unloaded and loaded the dishwasher (evening)
• cleaned the stovetop

**Tool call:** { "chores": ["unloaded the dishwasher", "unloaded the dishwasher", "loaded the dishwasher", "cleaned the stovetop"]}

**Input:** Today I:
• vacuumed the grand stairway, kitchen, pink bathroom, and 2nd floor hallway
• cleaned the small kitchen table and game room table
• cleaned the stove vent hood
• small dishwasher load, unload, and run (nighttime)

**Tool call:** { "chores": ["vacuumed the grand stairway", "vacuumed the kitchen", "vacuumed the pink bathroom", "vacuumed the 2nd floor hallway", "cleaned the small kitchen table", "cleaned the game room table", "cleaned the stove vent hood", "small dishwasher load", "small dishwasher unload", "ran dishwasher"]}

**Input:** today i:
- ordered gronkeries and put them away with callie's help
- cooked dinner for 3/5 + leftovers
- took out depositables and small recycling
**Tool call:** { "chores": ["ordered groceries", "put away groceries", "cooked dinner", "took out can recycling", "took out small recycling"]}

**Input:** Today:
- Dishwasher Loady / Starty
- Drying Rack
- small unloaded dishwasher evening
- Full Sink Scrubdown Clean
**Tool call:** { "chores": ["loaded the dishwasher", "started the dishwasher", "put away drying rack dishes", "small unloaded dishwasher", "thoroughly cleaned the sink"]}

**Input:** 
today i:
- cooked dinner for 5/5! and helped clean up after dinner (threw out beans; wrapped up and put in the fridge guac, fajita meat, tomates, and lettuce; fridged salsa; put away tortillas)
- vacuumed and wet swiffed the gbr
- did gbr towel laundry (is currently drying)
- all recycling
**Tool call:** { "chores": ["cooked dinner", "took care of dinner leftovers",  "vacuumed the green bathroom", "wet swiffed the green bathroom", "did the green bathroom towel laundry", "took out can recycling", "took out small recycling", "took out big recycling"]}

**Input:** today i:

- cooked dinner
- ordered and put away groceries
- cleaned a single pot (was put away, dishwasher didn't completely clean)

SIDE NOTE: single pot was a small saucepot that had some stuck on food, so it was hand washed to be used for dinner
**Tool call:** { "chores": ["cooked dinner", "ordered groceries", "put away groceries", "hand washed a small saucepot"]}

**Input:** today:

unloady am
loady lunchtime
vacuumed: kitchen, narrow stairs, entry
loady dinnertime, ran dishwasher
tiny manual wash (colander and a small saucepot)
put away dinner leftovers
clorox wiped food prep counters and tiny table after dinner
quick vacuumed kitchen after dinner (crumb pickup/antwatch)
vacuumed 2f hall, grand stairs + its landing, airlock
**Tool call:** { "chores": ["unloaded the dishwasher", "loaded the dishwasher", "vacuumed the kitchen", "vacuumed the narrow stairs", "vacuumed the entryway", "loaded the dishwasher", "ran the dishwasher", "small hand washed dishes", "put away dinner leftovers", "cleaned spice countertop", "cleaned microwave countertop", "cleaned kitchen table", "quick vacuumed kitchen after dinner", "vacuumed the second floor hallway", "vacuumed the grand stairway" , "vacuumed grand stairway landing", "vacuumed the airlock"]}
`
  const messages = [
    commonShortnamePrompt,
    ...(choreDefinitionsMessage ? [choreDefinitionsMessage] : []),
    `# Chore Message to Split\n\n${input.message}`,
  ]

  const { chores } = await Atlas.processToolRequest(
    ChoreSplitterTool,
    systemMessage,
    messages,
    undefined,
    tracer,
    0.7,
  )

  const gapSystemMessage = `You are a careful auditor reviewing whether a chore-splitting step missed any chores.

You will be given:
1. The original message that was split into chores.
2. The list of chores that were already identified.

Your job is to identify any chores described in the original message that are NOT already represented in the identified list. Be specific — only return chores that are genuinely missing, not paraphrases of chores already present. If all chores are accounted for, return an empty array.

# Examples

**Input:**
Original Message: "I cleaned the kitchen countertops and Dusted lint dust from washer and dryer, gave dryer a quick lint brushing, and wiped a lil scummy buildup from inside of washer door."
Already Identified Chores: ["cleaned the kitchen countertop(s)", "partially cleaned the washer"]

**Output:** ["partially cleaned the dryer"]

**Input:**
Original Message: "I cleaned the spice countertop, microwave countertop, and the sink. I also did the laundry for the pbr."
Already Identified Chores: ["cleaned the kitchen countertop(s)", "cleaned the kitchen sink", "did the laundry for the pink bathroom"]

**Output:** []

**Input:**
Original Message: "I wetswiffed the gbr, 2f hallway, and quick vacc'd the livvy and the grand staircase."
Already Identified Chores: ["wetswiffed the green bathroom", "quick vacuumed the living room", "quick vacuumed the grand staircase"]

**Output:** ["wetswiffed the second floor hallway"]

**Input:**
Yesterday:
- small loady (couple sessions throughout day) & ran dishwasher pm
- vacuumed kitchen, narrow stairs, entry
- clorox wiped counters pm
- clorox wiped gbr sink
Already Identified Chores: ["ran the dishwasher", "vacuumed the kitchen", "vacuumed the narrow stairs", "vacuumed the entryway", "cleaned the green bathroom sink"]

**Output:** ["partially loaded the dishwasher", "clorox wiped the kitchen countertop(s)"]
`

  const gapMessages = [
    commonShortnamePrompt,
    `# Original Message\n\n${input.message}`,
    `# Already Identified Chores\n\n${chores
      .map((c, i) => `${i + 1}. ${c}`)
      .join('\n')}`,
    `Identify any chores in the original message that are NOT already in the list above. Return only the missing ones.`,
  ]

  const { chores: missingChores } = await Atlas.processToolRequest(
    ChoreSplitterTool,
    gapSystemMessage,
    gapMessages,
    undefined,
    tracer,
    0.3,
  )

  const combinedChores = [...chores, ...missingChores]

  const auditSystemMessage = `${systemMessage}

# Audit Instructions

You are now reviewing an already-extracted chore list for accuracy. Your job is to correct inaccuracies — not to re-split.

You will be given:
1. The original chore message.
2. A numbered list of chores extracted from that message.

For each extracted chore, decide:
- KEEP it (emit no change) if it accurately reflects something described in the original message. This should be the outcome for the vast majority of chores.
- REMOVE it if it is hallucinated — not mentioned or clearly not implied by the original message at all.
- RENAME it only if the wording is substantively wrong in a way that would mislead — e.g. the original says "quick vacuum" but the extraction says "deep cleaned the kitchen." Do NOT rename for stylistic differences, minor wording variations, or shortname expansions that are already correct. Renames should be rare.

Do not add new chores — only correct or remove existing ones. When in doubt, keep.`

  const auditMessages = [
    commonShortnamePrompt,
    ...(choreDefinitionsMessage ? [choreDefinitionsMessage] : []),
    `# Original Message\n\n${input.message}`,
    `# Extracted Chores\n\n${combinedChores
      .map((c, i) => `${i}. ${c}`)
      .join('\n')}`,
    `Review the extracted chores against the original message. For each inaccuracy, emit a change: remove hallucinated chores, rename ones that misrepresent the original. If the list is fully accurate, return an empty changes array.`,
  ]

  const { changes } = await Atlas.processToolRequest(
    ChoreAuditorTool,
    auditSystemMessage,
    auditMessages,
    undefined,
    tracer,
    0.2,
  )

  return {
    date: input.date,
    chores: applyChoreAuditChanges(combinedChores, changes),
  }
}
