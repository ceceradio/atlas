import { Badge, Button, Flex, HStack, Input, Select, Text } from '@chakra-ui/react'
import { ChoreItem } from '@/store/atlasApi'

export const DIFFICULTY_OPTIONS = ['small', 'medium', 'large', 'extra large', 'not a chore']

export const difficultyColor: Record<string, string> = {
  small: 'green',
  medium: 'yellow',
  large: 'red',
  'extra large': 'purple',
  'not a chore': 'gray',
}

export type EditForm = {
  description: string
  doneAt: string
  difficulty: string
}

export function ChoreRow({
  chore,
  onEdit,
  onRescan,
  isRescanning,
  showAuthor = true,
}: {
  chore: ChoreItem
  onEdit: () => void
  onRescan: () => void
  isRescanning: boolean
  showAuthor?: boolean
}) {
  const edited =
    chore.description !== chore.aiOriginal.description ||
    chore.doneAt !== chore.aiOriginal.doneAt ||
    chore.difficulty !== chore.aiOriginal.difficulty

  return (
    <Flex
      padding="0.75rem 1rem"
      background="gray.50"
      borderRadius="md"
      alignItems="center"
      gap="1rem"
      flexWrap="wrap"
    >
      <Badge colorScheme={difficultyColor[chore.difficulty] ?? 'purple'} minWidth="80px" textAlign="center">
        {chore.difficulty}
      </Badge>
      <Text fontSize="sm" color="gray.500" minWidth="90px">
        {chore.doneAt}
      </Text>
      <Text flex="1">{chore.description}</Text>
      {showAuthor && (
        <Text fontSize="sm" color="gray.400">
          {chore.choreMessage.discordAuthorName}
        </Text>
      )}
      {edited && (
        <Badge colorScheme="blue" variant="outline" fontSize="xs">
          edited
        </Badge>
      )}
      <Button size="xs" variant="ghost" onClick={onEdit} isDisabled={isRescanning}>
        Edit
      </Button>
      <Button size="xs" variant="ghost" colorScheme="orange" onClick={onRescan} isLoading={isRescanning}>
        Rescan
      </Button>
    </Flex>
  )
}

export function ChoreEditRow({
  form,
  onChange,
  onSave,
  onCancel,
}: {
  form: EditForm
  onChange: (f: EditForm) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <Flex
      padding="0.75rem 1rem"
      background="blue.50"
      borderRadius="md"
      alignItems="center"
      gap="0.5rem"
      flexWrap="wrap"
    >
      <Select
        value={form.difficulty}
        onChange={(e) => onChange({ ...form, difficulty: e.target.value })}
        width="150px"
        size="sm"
      >
        {DIFFICULTY_OPTIONS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </Select>
      <Input
        type="date"
        value={form.doneAt}
        onChange={(e) => onChange({ ...form, doneAt: e.target.value })}
        width="160px"
        size="sm"
      />
      <Input
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
        flex="1"
        size="sm"
      />
      <Button size="sm" colorScheme="blue" onClick={onSave}>
        Save
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </Flex>
  )
}

