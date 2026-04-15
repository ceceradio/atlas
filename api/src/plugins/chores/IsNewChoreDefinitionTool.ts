import { ITool } from '@/atlas/IAtlas'

type IsNewChoreDefinitionArgs = {
  isNew: boolean
}

export const IsNewChoreDefinitionTool: ITool<IsNewChoreDefinitionArgs> = {
  name: 'IsNewChoreDefinition',
  description:
    'Report whether the given chore is a new type not covered by any existing chore definition.',
  arguments: {
    type: 'object',
    properties: {
      isNew: {
        type: 'boolean',
        description:
          'true if the chore does not match any existing definition (even loosely), false if it matches one even a little bit.',
      },
    },
    required: ['isNew'],
  },
  call: async (_request, _response, value) => value,
}
