import { ITool } from '@/atlas/IAtlas'

type ChoreSplitterToolArgs = {
  chores: string[]
}

export const ChoreSplitterTool: ITool<ChoreSplitterToolArgs> = {
  name: 'ChoreSplitter',
  description:
    'Tool to return the results of splitting a message into parts based on the date the chores were performed.',
  arguments: {
    type: 'object',
    properties: {
      chores: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'An array of chores that were performed on the given date. Must be a JSON array, not a string.',
      },
    },
    required: ['chores'],
  },
  call: async (request, response, value) => {
    return value
  },
}
