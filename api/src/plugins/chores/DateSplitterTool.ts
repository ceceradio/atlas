import { ITool } from '@/atlas/IAtlas'
import { DatedChoresRaw } from './ChoreTypes'

type DateSplitterToolArgs = {
  splits: DatedChoresRaw[]
}

export const DateSplitterTool: ITool<DateSplitterToolArgs> = {
  name: 'DateSplitter',
  description:
    'Tool to return the results of splitting a message into parts based on the date the chores were performed.',
  arguments: {
    type: 'object',
    properties: {
      splits: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description:
                'The date the chore was performed, in YYYY-MM-DD format.',
            },
            message: {
              type: 'string',
              description:
                'The part of the message that corresponds to chores performed on that date.',
            },
          },
          required: ['date', 'message'],
        },
        description:
          'An array where the message has been split into parts that each correspond to a single day. Must be a JSON array, not a string.',
      },
    },
    required: ['splits'],
  },
  call: async (request, response, value) => {
    return value
  },
}
