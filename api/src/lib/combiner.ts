import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'
import { Atlas } from '@/atlas/Atlas'
import { commonShortnamePrompt } from '@/plugins/chores/choreSplitter'
import { CombinerTool } from './CombinerTool'

export async function combiner(
  arrays: string[][],
  tracer?: ITracer,
): Promise<string[]> {
  const systemMessage = `You are a utility that merges multiple result arrays from independent AI runs on the same input.
Some items across the arrays may be exact duplicates or semantic equivalents (e.g. "vacuumed the gbr" and "vacuumed the green bathroom" are the same thing).
Your job is to return a single unified array that deduplicates items across the input arrays, while preserving items only included in some. 
When two or more items mean the same thing — even if worded differently — keep only one, using the most descriptive and fully spelled-out wording. Prefer any version. Be aggressive about merging: if two items describe the same physical action or outcome across arrays, they are duplicates even if the phrasing is quite different.
Do not deduplicate within the final array — only across the input arrays. If an item appears twice in the same input array, it should appear twice in the output, even if one input array includes it one time. Only deduplicate if the same or semantically equivalent item appears in multiple input arrays.
Preserve all genuinely distinct items — do not drop anything that represents a unique result; however, ensure that the final array has an accurate number of unique items. If the 3 candidates each contain n chores, and each chore is duplicated across the candidates, then the final array should have 2 unique chores.
If one item is a comma-joined list that enumerates the same things as several individual items in other arrays, treat them as duplicates and keep the individual items rather than the comma-joined string.
The output must be a flat array of strings with no duplicates.

${commonShortnamePrompt}`

  const userMessage = arrays
    .map((arr, i) => `Array ${i + 1}:\n${JSON.stringify(arr)}`)
    .join('\n\n')

  const { items } = await Atlas.processToolRequest(
    CombinerTool,
    systemMessage,
    [userMessage],
    undefined,
    tracer,
  )

  return items
}
