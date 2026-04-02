import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { Atlas } from '@/atlas/Atlas'
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

export async function choreSplitter(
  input: DatedChoresRaw,
  tracer?: ITracer,
): Promise<DatedChores> {
  const systemMessage = `You are a helpful assistant that reads a list of chores that someone did, and splits them into individual chores in an array.
The chores need to be split into an array of items that each counts as a single chore.
For example, if the input is "I cleaned the kitchen and did the laundry", the output should be ["cleaned the kitchen", "did the laundry"].
Chores could be provided in a list format, in a paragraph format, or mixed. Even in a list format, two or more chores could be in a single list item, or a single chore could be split across multiple list items.
The output should be an array of strings, where each string is a single chore that was done.

${commonShortnamePrompt}

# Examples

Here are some examples of how to split chores:

Input: "I cleaned the kitchen countertops and did the gbr laundry"
Output: ["cleaned the kitchen countertop(s)", "did the green bathroom laundry"]

Input: "I cleaned the spice countertop, microwave countertop, and the sink. I also did the laundry for the pbr."
Output: ["cleaned the kitchen countertop(s)", "cleaned the kitchen sink", "did the laundry for the pink bathroom"]

Input: I wetswiffed the gbr, 2f hallway, and quick vacc'd the livvy.
Output: ["wetswiffed the green bathroom", "wetswiffed the second floor hallway", "quick vacuumed the living room"]

Input: Ordered and put away groceries
Output: ["ordered groceries", "put away groceries"]

Input: "Loaded, unloaded, and started the dishwasher. put away drying rack. Took out the trash and rebagged the garage cans."
Output: ["loaded/unloaded the dishwasher", "started the dishwasher", "put away drying rack dishes", "took out the trash", "rebagged the garage cans"]

Input: "replaced air filter and vacuumed the unit"
Output: ["replaced air filter", "cleaned the air filter"]

Input: "Swept up collected salt, bugs, and dirt from garage floor"
Output: ["swept garage floor"]
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
