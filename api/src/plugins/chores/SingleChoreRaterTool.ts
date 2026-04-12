import { ITool } from '@/atlas/IAtlas'
import { ChoreDifficulty } from './ChoreTypes'

type SingleChoreRaterToolArgs = {
  difficulty: ChoreDifficulty
}

export const SingleChoreRaterTool: ITool<SingleChoreRaterToolArgs> = {
  name: 'SingleChoreRater',
  description: 'Tool to return the difficulty rating for a single chore.',
  arguments: {
    type: 'object',
    properties: {
      difficulty: {
        type: 'string',
        enum: ['not a chore', 'small', 'medium', 'large', 'extra large'],
        description:
          'The difficulty rating of the chore, which can be "not a chore", "small", "medium", "large", or "extra large".',
      },
    },
    required: ['difficulty'],
  },
  call: async (request, response, value) => {
    return value
  },
}
