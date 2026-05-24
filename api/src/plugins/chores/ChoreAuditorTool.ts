import { ITool } from '@/atlas/IAtlas'

export type ChoreAuditChange =
  | { action: 'remove'; number: number }
  | { action: 'rename'; number: number; name: string }

type ChoreAuditorToolArgs = {
  changes: ChoreAuditChange[]
}

export const ChoreAuditorTool: ITool<ChoreAuditorToolArgs> = {
  name: 'ChoreAuditor',
  description:
    'Tool to return corrections to a chore list. Each change either removes a chore by its number or renames it. Return an empty array if the list is accurate.',
  arguments: {
    type: 'object',
    properties: {
      changes: {
        type: 'array',
        items: {
          oneOf: [
            {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['remove'] },
                number: {
                  type: 'integer',
                  description: 'The 0-based index of the chore to remove.',
                },
              },
              required: ['action', 'number'],
            },
            {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['rename'] },
                number: {
                  type: 'integer',
                  description: 'The 0-based index of the chore to rename.',
                },
                name: {
                  type: 'string',
                  description: 'The corrected chore description.',
                },
              },
              required: ['action', 'number', 'name'],
            },
          ],
        },
        description:
          'List of changes to apply. Empty array means the chore list is already correct.',
      },
    },
    required: ['changes'],
  },
  call: async (request, response, value) => {
    return value
  },
}

export function applyChoreAuditChanges(
  chores: string[],
  changes: ChoreAuditChange[],
): string[] {
  const result = [...chores]
  const removeIndices = new Set<number>()
  for (const change of changes) {
    const i = change.number
    if (i < 0 || i >= chores.length) continue
    if (change.action === 'rename') result[i] = change.name
    if (change.action === 'remove') removeIndices.add(i)
  }
  return result.filter((_, i) => !removeIndices.has(i))
}
