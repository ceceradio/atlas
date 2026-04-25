import { Atlas } from '@/atlas/Atlas'
import { ITool } from '@/atlas/IAtlas'
import { ITracer } from '@/atlas/ai-compat/langfuse/ITracer'

type SelectArgs = { index: number | null }

export async function selectFromList<T>(
  items: T[],
  subject: string,
  instruction: string,
  tracer?: ITracer,
): Promise<T | null> {
  if (items.length === 0) return null

  const tool: ITool<SelectArgs, number | null> = {
    name: 'SelectItem',
    description:
      'Select the index of the item that best matches the instruction, or null if none match well enough.',
    arguments: {
      type: 'object',
      properties: {
        index: {
          oneOf: [
            {
              type: 'integer',
              minimum: 0,
              maximum: items.length - 1,
              description: 'Zero-based index of the best matching item.',
            },
            { type: 'null', description: 'Use null if no item matches.' },
          ],
        },
      },
      required: ['index'],
    },
    call: async (_req, _res, { index }) => index,
  }

  const numberedList = items
    .map((item, i) => `[${i}] ${JSON.stringify(item)}`)
    .join('\n')

  const systemPrompt = `You are a precise selector. Given a subject and a list of numbered items, select the single item whose meaning best matches the instruction relative to the subject. If no item is a reasonable match, return null.

Items:
${numberedList}`

  const selected = await Atlas.processToolRequest(
    tool,
    systemPrompt,
    [`Subject: ${subject}\nInstruction: ${instruction}`],
    undefined,
    tracer,
  )

  return selected === null ? null : items[selected]
}
