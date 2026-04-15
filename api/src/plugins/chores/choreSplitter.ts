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
    // Load all unsized definitions — these are the ones still being named/discovered
    const defs = await db
      .getRepository(ChoreDefinition)
      .createQueryBuilder('def')
      .where('def.size IS NULL')
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

The following chore names are already recognized in this household. When you output chore descriptions, prefer using these exact names (or close variants that preserve the meaning). Aliases are listed to help you recognize alternate ways the same chore might be mentioned.

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
For example, if the input is "I cleaned the kitchen and did the laundry", the output should be ["cleaned the kitchen", "did the laundry"].
Basically, the word "and" should signify that you probably need to split one list item into two or more. However, sometimes "and" is used to connect two parts of a single chore, like "loaded and started the dishwasher". In that case, the output should be ["loaded and started the dishwasher"] — do not split that into two chores.
Chores like vacuuming, wet swiffed, cleaning, and doing laundry are often performed in multiple rooms in the same day, and those should be split into separate chores for each room. For example, "vacuumed the grand stairway, kitchen, pink bathroom, and 2nd floor hallway" should be split into ["vacuumed the grand stairway", "vacuumed the kitchen", "vacuumed the pink bathroom", "vacuumed the 2nd floor hallway"].
Chores could be provided in a list format, in a paragraph format, or mixed. Even in a list format, two or more chores could be in a single list item, or a single chore could be split across multiple list items.
The output should be an array of strings, where each string is a single chore that was done.

${commonShortnamePrompt}

# Examples

Here are some examples of how to split chores:

Input: \`I cleaned the kitchen countertops and did the gbr laundry\`
Tool call: \`ChoreSplitter({ "chores": ["cleaned the kitchen countertop(s)", "did the green bathroom laundry"] })\`

Input: \`I cleaned the spice countertop, microwave countertop, and the sink. I also did the laundry for the pbr.\`
Tool call: \`ChoreSplitter({ "chores": ["cleaned the kitchen countertop(s)", "cleaned the kitchen sink", "did the laundry for the pink bathroom"] })\`

Input: \`I wetswiffed the gbr, 2f hallway, and quick vacc'd the livvy and the grand staircase.\`
Tool call: \`ChoreSplitter({ "chores": ["wetswiffed the green bathroom", "wetswiffed the second floor hallway", "quick vacuumed the living room", "quick vacuumed the grand staircase"] })\`

Input: \`cleaned the kitchen counters, and the game room table\`
Tool call: \`ChoreSplitter({ "chores": ["cleaned the kitchen counters", "cleaned the game room table"] })\`

Input: \`cleaned the kitchen counters, the game room table, and tidied dining room table\`
Tool call: \`ChoreSplitter({ "chores": ["cleaned the kitchen counters", "cleaned the game room table", "tidied the dining room table"] })\`

Input: \`Ordered and put away gronks\`
Tool call: \`ChoreSplitter({ "chores": ["ordered groceries", "put away groceries"] })\`

Input: \`Loaded, unloaded, and started the dishwasher. put away drying rack. did the garage cans.\`
Tool call: \`ChoreSplitter({ "chores": ["loaded/unloaded the dishwasher", "started the dishwasher", "put away drying rack dishes", "took out the trash", "rebagged the garage cans"] })\`

Input: \`replaced air filter and vacuumed the unit\`
Tool call: \`ChoreSplitter({ "chores": ["replaced air filter", "vacuumed the unit"] })\`

Input: \`Swept up collected salt, bugs, and dirt from garage floor. vacuumed the narrow and grand stairways. recycle bin in\`
Tool call: \`ChoreSplitter({ "chores": ["swept garage floor", "vacuumed the narrow stairway", "vacuumed the grand stairway", "brought the the recycle bin back inside"] })\`

Input: \`Today: -Cleared a bunch of old food out of the fridge -PBR Trash -Re-bagged Bin\`
Tool call: \`ChoreSplitter({ "chores": ["cleared old food out of the fridge", "took out the pink bathroom trash", "re-bagged garage bin"] })\`

Input: \`Today: - Cooked Dinner - Drying Rack - Hand Washy\`
Tool call: \`ChoreSplitter({ "chores": ["cooked dinner", "put away drying rack dishes", "hand washed dishes"] })\`

Input: \`Today I:
• vacuumed the grand stairway, kitchen, pink bathroom, and 2nd floor hallway
• cleaned the small kitchen table and game room table
• cleaned the stove vent hood
• small dishwasher load, unload, and run (nighttime)\`
Tool call: \`ChoreSplitter({ "chores": ["vacuumed the grand stairway", "vacuumed the kitchen", "vacuumed the pink bathroom", "vacuumed the 2nd floor hallway", "cleaned the small kitchen table", "cleaned the game room table", "cleaned the stove vent hood", "small dishwasher load, unload, and run (nighttime)"] })\`
${choreDefinitionsPrompt}`
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
