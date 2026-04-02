import { ITool } from '../../IAtlas'

type ShouldRespondToolArgs = { answer: boolean }

export const ShouldRespondTool: ITool<ShouldRespondToolArgs, boolean> = {
  name: 'ShouldRespond',
  description:
    'Tool to answer if the assistant should respond or say anything. True = yes.',
  arguments: {
    type: 'object',
    properties: {
      answer: {
        type: 'boolean',
        description:
          'Set value to `true` if Atlas should add a message to the conversation based on the instructions given. Set value to `false` otherwise. (Required)',
      },
    },
    required: ['answer'],
  },
  call: async (request, response, { answer }) => {
    return answer
  },
}
