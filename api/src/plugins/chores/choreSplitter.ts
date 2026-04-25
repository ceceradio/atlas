import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { Atlas } from '@/atlas/Atlas'
import { getDataSource } from '@/data-source'
import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { ChoreSplitterTool } from './ChoreSplitterTool'
import { DatedChores, DatedChoresRaw } from './ChoreTypes'

export const commonShortnames = {
  gbr: 'green bathroom',
  pbr: 'pink bathroom',
  livvy: 'living room',
  '2f': 'second floor',
}

export const commonShortnamePrompt = `# Shortnames

Chores are generally performed in certain areas of the house, and those areas often have shortnames. For example, "gbr" is a common shortname for "green bathroom."
Here are some common shortnames and their corresponding full names:
${Object.entries(commonShortnames)
  .map(([shortname, fullName]) => `- ${shortname}: ${fullName}`)
  .join('\n')}

When you see a shortname in the input, replace it with the full name in the output. For example, if the input is "cleaned the gbr", the output should be "cleaned the green bathroom".`

async function buildChoreDefinitionsPrompt(): Promise<string> {
  try {
    const db = await getDataSource()
    // Load all sized definitions — these are the ones that have been named/discovered
    const defs = await db
      .getRepository(ChoreDefinition)
      .createQueryBuilder('def')
      .where('def.size IS NOT NULL')
      .orderBy('def.name', 'ASC')
      .getMany()

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

    return `\n# Known Chore Names

The following chore names are already recognized in this household.
When you output chore descriptions, prefer using these exact names if they exist, but if not, then copy what the user has written minus the time of day or other superfluous details.
Aliases are listed to help you recognize alternate ways the same chore might be mentioned.
Often people will do chores using different words than the chore definition does, but if they mean the exact same thing, it's okay to use the chore definition.
However, if the user input seems to be describing a chore that is meaningfully different than any of the existing chore definitions, then it's better to output a new chore description that more closely matches the user's wording, even if it doesn't match the existing chore definitions. The goal is to be flexible and understand the user's intent, but also to try to use existing chore definitions when they are a good fit.
An example might be, "threw out pizza boxes from karaoke night" — there probably is no existing chore definition for this exact task, so output: ["threw out pizza boxes from karaoke night"], even if there is an existing chore definition for "took out the trash" that this could be considered an instance of. On the other hand, if the input is "took out the pink bathroom trash and the kitchen trash", then it's better to output ["took out the pink bathroom trash", "took out the kitchen trash"] rather than trying to use an existing chore definition, because the user's wording is already pretty close to the existing chore definitions, and it seems like they are intentionally describing two separate chores. The goal is to strike a balance between using existing chore definitions when they are a good fit, but also being flexible and understanding the user's intent when their wording doesn't quite match any existing chore definitions.

${lines.join('\n')}`
  } catch {
    return ''
  }
}

export async function choreSplitter(
  input: DatedChoresRaw,
  tracer?: ITracer,
): Promise<DatedChores> {
  const choreDefinitionsPrompt = await buildChoreDefinitionsPrompt()
  const systemMessage = `You are a helpful assistant that reads a list of chores that someone did, and splits them into individual chores in an array.
The chores need to be split into an array of items that each counts as a single chore.
For example, if the input is "I cleaned the kitchen and did the laundry", the output should be \`["cleaned the kitchen", "did the laundry"]\`.
Basically, the word "and" signifies that you may need to split one list item into two or more. Another examples is "loaded and started the dishwasher". In that case, the output should be \`["loaded the dishwasher", "started the dishwasher"]\`.
Chores like vacuuming, wet swiffed, cleaning, and doing laundry are often performed in multiple rooms in the same day, and those should be split into separate chores for each room. For example, "vacuumed the grand stairway, kitchen, pink bathroom, and 2nd floor hallway" should be split into \`["vacuumed the grand stairway", "vacuumed the kitchen", "vacuumed the pink bathroom", "vacuumed the 2nd floor hallway"]\`.
Chores could be provided in a list format, in a paragraph format, or mixed. Even in a list format, two or more chores could be in a single list item, or a single chore could be split across multiple list items. Be flexible with how you read them and try to split them into separate chores as best as you can.
The output should be an array of strings, where each string is a single chore that was done. A good rule of thumb is that if the chore description contains the word "and", or if it seems to be describing two or more distinct tasks, then it should probably be split into multiple chores. This happens a lot with loading and unloading the dishwasher, which are two separate and distinct chores, but are often done together. Be sure to split chores like that.

${commonShortnamePrompt}

${choreDefinitionsPrompt}

# Examples

Here are some examples of how to split chores:

Input: \`I cleaned the kitchen countertops and did the gbr laundry\`
Tool call: \`ChoreSplitter({ "chores": ["cleaned the kitchen countertop(s)", "did the green bathroom laundry"] })\`

Input: \`I cleaned the spice countertop, microwave countertop, and the sink. I also did the laundry for the pbr.\`
Tool call: \`ChoreSplitter({ "chores": ["cleaned the kitchen countertop(s)", "cleaned the kitchen sink", "did the laundry for the pink bathroom"] })\`

Input: \`I wetswiffed the gbr, 2f hallway, and quick vacc'd the livvy and the grand staircase.\`
Tool call: \`ChoreSplitter({ "chores": ["wetswiffed the green bathroom", "wetswiffed the second floor hallway", "quick vacuumed the living room", "quick vacuumed the grand staircase"] })\`

Input: \`I cleaned the kitchen countertops, and vacuumed the game room green bathroom, kitchen, narrow stairway grand stairway and practice area\`
Tool call: \`ChoreSplitter({ "chores": ["cleaned the kitchen countertop(s)", "vacuumed the game room", "vacuumed the green bathroom", "vacuumed the kitchen", "vacuumed the narrow stairway", "vacuumed the grand stairway", "vacuumed the practice area"] })\`

Input: \`cleaned the kitchen counters, and the game room table\`
Tool call: \`ChoreSplitter({ "chores": ["cleaned the kitchen counters", "cleaned the game room table"] })\`

Input: \`cleaned the kitchen counters, the game room table, and tidied dining room table\`
Tool call: \`ChoreSplitter({ "chores": ["cleaned the kitchen counters", "cleaned the game room table", "tidied the dining room table"] })\`

Input: \`Ordered and put away gronks\`
Tool call: \`ChoreSplitter({ "chores": ["ordered groceries", "put away groceries"] })\`

Input: \`Loaded, unloaded, and started the dishwasher. put away drying rack. did the garage cans.\`
Tool call: \`ChoreSplitter({ "chores": ["loaded the dishwasher", "unloaded the dishwasher", "started the dishwasher", "put away drying rack dishes", "took out the trash", "rebagged the garage cans"] })\`

Input: \`replaced air filter and vacuumed the unit\`
Tool call: \`ChoreSplitter({ "chores": ["replaced air filter", "vacuumed the unit"] })\`

Input: \`unloaded the dishwasher (morning), unloaded and loaded the dishwasher (evening)\`
Tool call: \`ChoreSplitter({ "chores": ["unloaded the dishwasher", "unloaded the dishwasher", "loaded the dishwasher"] })\`

Input: \`Swept up collected salt, bugs, and dirt from garage floor. vacuumed the narrow and grand stairways. recycle bin in\`
Tool call: \`ChoreSplitter({ "chores": ["swept garage floor", "vacuumed the narrow stairway", "vacuumed the grand stairway", "brought the the recycle bin back inside"] })\`

Input: \`Today: -Cleared a bunch of old food out of the fridge -PBR Trash -Re-bagged Bin\`
Tool call: \`ChoreSplitter({ "chores": ["cleared old food out of the fridge", "took out the pink bathroom trash", "re-bagged garage bin"] })\`

Input: \`Today: - Cooked Dinner - Drying Rack - Hand Washy\`
Tool call: \`ChoreSplitter({ "chores": ["cooked dinner", "put away drying rack dishes", "hand washed dishes"] })\`

Input: \`Yesterday I:
• unloaded the dishwasher (morning), unloaded and loaded the dishwasher (evening)
• cleaned the stovetop\`
Tool call: \`ChoreSplitter({ "chores": ["unloaded the dishwasher", "unloaded the dishwasher", "loaded the dishwasher", "cleaned the stovetop"] })\`

Input: \`Today I:
• vacuumed the grand stairway, kitchen, pink bathroom, and 2nd floor hallway
• cleaned the small kitchen table and game room table
• cleaned the stove vent hood
• small dishwasher load, unload, and run (nighttime)\`
Tool call: \`ChoreSplitter({ "chores": ["vacuumed the grand stairway", "vacuumed the kitchen", "vacuumed the pink bathroom", "vacuumed the 2nd floor hallway", "cleaned the small kitchen table", "cleaned the game room table", "cleaned the stove vent hood", "small dishwasher load", "small dishwasher unload", "ran dishwasher"] })\`

Input: \`today i:
- ordered gronkeries and put them away with callie's help
- cooked dinner for 3/5 + leftovers\`
Tool call: \`ChoreSplitter({ "chores": ["ordered groceries", "put away groceries", "cooked dinner"] })\`

Input: \`Today:
- Dishwasher Loady / Starty
- Drying Rack
- Full Sink Scrubdown Clean\`
Tool call: \`ChoreSplitter({ "chores": ["loaded the dishwasher", "started the dishwasher", "put away drying rack dishes", "thoroughly cleaned the sink"] })\`

Input: \`today i:
- cooked dinner for 5/5! and helped clean up after dinner (threw out beans; wrapped up and put in the fridge guac, fajita meat, tomates, and lettuce; fridged salsa; put away tortillas)
- vacuumed and wet swiffed the gbr
- did gbr towel laundry (is currently drying)\`
Tool call: \`ChoreSplitter({ "chores": ["cooked dinner", "took care of dinner leftovers",  "vacuumed the green bathroom", "wet swiffed the green bathroom", "did the green bathroom towel laundry"] })\`
`
  const { chores } = await Atlas.processToolRequest(
    ChoreSplitterTool,
    systemMessage,
    [input.message],
    undefined,
    tracer,
  )
  return {
    date: input.date,
    chores,
  }
}
