import { ITool } from '@/atlas/IAtlas'

type CombinerToolArgs = {
  items: string[]
}

export const CombinerTool: ITool<CombinerToolArgs> = {
  name: 'Combiner',
  description: 'Return the unified, deduplicated list of items.',
  arguments: {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { type: 'string' },
        description: 'The unified array of unique items. Must be a JSON array, not a string.',
      },
    },
    required: ['items'],
  },
  call: async (_req, _res, value) => value,
}
