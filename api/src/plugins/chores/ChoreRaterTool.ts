import { ITool } from '@/atlas/IAtlas'
import { DatedRatedChores } from './ChoreTypes'

type ChoreRaterToolArgs = {
  chores: DatedRatedChores['chores']
}

export const ChoreRaterTool: ITool<ChoreRaterToolArgs> = {
  name: 'ChoreRater',
  description:
    'Tool to return the results of rating the difficulty of chores based on the date they were performed.',
  arguments: {
    type: 'object',
    properties: {
      chores: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            chore: {
              type: 'string',
              description: 'The name of the chore that was performed.',
            },
            difficulty: {
              type: 'string',
              enum: ['not a chore', 'small', 'medium', 'large'],
              description:
                'The difficulty rating of the chore, which can be "not a chore", "small", "medium", or "large".',
            },
          },
          required: ['chore', 'difficulty'],
        },
        description:
          'An array of chores that were performed on the given date, along with their difficulty ratings. Must be a JSON array, not a string.',
      },
    },
    required: ['chores'],
  },
  call: async (request, response, value) => {
    return value
  },
}
