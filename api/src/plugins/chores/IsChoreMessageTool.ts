import { ITool } from '@/atlas/IAtlas'

type IsChoreMessageArgs = { answer: boolean }

export const IsChoreMessageTool: ITool<IsChoreMessageArgs, boolean> = {
  name: 'IsChoreMessage',
  description:
    'Tool to answer whether the message contains any mention of chores that were completed.',
  arguments: {
    type: 'object',
    properties: {
      answer: {
        type: 'boolean',
        description:
          'Set to `true` if the message contains any first-person mention of chores the author completed. Set to `false` only if there is no completed chore work mentioned at all. (Required)',
      },
    },
    required: ['answer'],
  },
  call: async (request, response, { answer }) => {
    return answer
  },
}
