import { ITool } from '@/atlas/IAtlas'

type IsChoreMessageArgs = { answer: boolean }

export const IsChoreMessageTool: ITool<IsChoreMessageArgs, boolean> = {
  name: 'IsChoreMessage',
  description:
    'Tool to answer whether the message contains any mention of chores that were completed or that the author intends to do.',
  arguments: {
    type: 'object',
    properties: {
      answer: {
        type: 'boolean',
        description:
          'Set to `true` if the message contains any first-person mention of chores the author completed or intends to do. Set to `false` only if there is no chore work (completed or planned) mentioned at all. (Required)',
      },
    },
    required: ['answer'],
  },
  call: async (request, response, { answer }) => {
    return answer
  },
}
