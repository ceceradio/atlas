import { Atlas } from '@/atlas/Atlas'
import { ITool } from '@/atlas/IAtlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'

type SelectMultipleArgs = { indices: number[] }

export async function selectMultipleFromList<T>(
  items: T[],
  subject: string,
  instruction: string,
  tracer?: ITracer,
): Promise<T[]> {
  if (items.length === 0) return []

  const tool: ITool<SelectMultipleArgs, number[]> = {
    name: 'SelectItems',
    description:
      'Select the indices of all items that match the instruction. Return an empty array if none match.',
    arguments: {
      type: 'object',
      properties: {
        indices: {
          type: 'array',
          items: {
            type: 'integer',
            minimum: 0,
            maximum: items.length - 1,
          },
          description:
            'Zero-based indices of all matching items. Empty array if none match.',
        },
      },
      required: ['indices'],
    },
    call: async (_req, _res, { indices }) => indices,
  }

  const numberedList = items
    .map((item, i) => `[${i}] ${JSON.stringify(item)}`)
    .join('\n')

  const systemPrompt = `You are a precise selector. Given a subject and a list of numbered items, select all items whose meaning matches the following instruction relative to the subject. Return an empty array if none qualify.

${instruction}

# Subject

${subject}`

  const selected = await Atlas.processToolRequest(
    tool,
    systemPrompt,
    [
      `Items:
${numberedList}`,
    ],
    undefined,
    tracer,
  )

  return selected.map((i) => items[i])
}
