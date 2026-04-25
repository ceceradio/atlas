import { ITool } from '@/atlas/IAtlas'

type ChoreAliasCheckArgs = {
  aliasOfId: string | null
}

export const ChoreAliasCheckTool: ITool<ChoreAliasCheckArgs> = {
  name: 'ChoreAliasCheck',
  description:
    'Report whether the given chore is an alias of an existing chore definition — the same underlying task described differently.',
  arguments: {
    type: 'object',
    properties: {
      aliasOfId: {
        type: ['string', 'null'],
        description:
          'The id of the existing chore definition this chore is an alias of, or null if it is a genuinely distinct new chore.',
      },
    },
    required: ['aliasOfId'],
  },
  call: async (_request, _response, value) => value,
}
