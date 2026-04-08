import {
  useGetChoresQuery,
  useGetAuthorsQuery,
  useGetDiscordChannelsQuery,
  useGetOrganizationQuery,
  useUpdateOrganizationSettingsMutation,
  useUpdateChoreMutation,
  useReprocessChoreMessageMutation,
  ChoreItem,
  ChoreAuthor,
} from '@/store/atlasApi'
import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Input,
  Select,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

const LIMIT = 20

const DIFFICULTY_OPTIONS = ['small', 'medium', 'large', 'not a chore']

const difficultyColor: Record<string, string> = {
  small: 'green',
  medium: 'yellow',
  large: 'red',
  'not a chore': 'gray',
}

type EditForm = {
  description: string
  doneAt: string
  difficulty: string
}

export function ChoresPanel() {
  const [page, setPage] = useState(1)
  const [authorId, setAuthorId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [rescanningMessageId, setRescanningMessageId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    description: '',
    doneAt: '',
    difficulty: '',
  })
  const [choresChannelId, setChoresChannelId] = useState('')

  const { data: choresData, isFetching: loading } = useGetChoresQuery({
    page,
    limit: LIMIT,
    discordAuthorId: authorId || undefined,
    from: from || undefined,
    to: to || undefined,
  })
  const chores = choresData?.data ?? []
  const total = choresData?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  const { data: authors = [] } = useGetAuthorsQuery()
  const { data: discordChannels = [] } = useGetDiscordChannelsQuery()
  const { data: org } = useGetOrganizationQuery()

  const [updateSettings, { isLoading: savingChannel }] = useUpdateOrganizationSettingsMutation()
  const [updateChore] = useUpdateChoreMutation()
  const [reprocessChoreMessage] = useReprocessChoreMessageMutation()

  useEffect(() => {
    if (org) {
      setChoresChannelId(org.settings?.discord?.choresChannelId ?? '')
    }
  }, [org])

  async function saveChoresChannel(channelId: string) {
    await updateSettings({
      ...org?.settings,
      discord: { ...org?.settings?.discord, choresChannelId: channelId || undefined },
    })
  }

  function startEdit(chore: ChoreItem) {
    setEditingId(chore.id)
    setEditForm({
      description: chore.description,
      doneAt: chore.doneAt,
      difficulty: chore.difficulty,
    })
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function handleRescan(choreMessageId: string) {
    setRescanningMessageId(choreMessageId)
    try {
      await reprocessChoreMessage(choreMessageId).unwrap()
    } finally {
      setRescanningMessageId(null)
    }
  }

  async function saveEdit(id: string) {
    await updateChore({ id, patch: editForm }).unwrap()
    setEditingId(null)
  }

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  return (
    <VStack padding="1.5rem" alignItems="stretch" gap="1rem">
      <Text fontSize="xl" fontWeight="bold">Chores</Text>

      {/* Channel settings */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb="0.5rem" color="gray.600">
          Discord channel
        </Text>
        <HStack>
          <Select
            value={choresChannelId}
            onChange={(e) => setChoresChannelId(e.target.value)}
            placeholder="Select a channel..."
            flex="1"
          >
            {discordChannels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name} — {c.guildName}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            colorScheme="blue"
            isLoading={savingChannel}
            onClick={() => saveChoresChannel(choresChannelId)}
          >
            Save
          </Button>
        </HStack>
      </Box>

      <Divider />

      {/* Filters */}
      <HStack gap="0.5rem" flexWrap="wrap">
        <Select
          placeholder="All people"
          value={authorId}
          onChange={handleFilterChange(setAuthorId)}
          width="200px"
        >
          {(authors as ChoreAuthor[]).map((a) => (
            <option key={a.discordAuthorId} value={a.discordAuthorId}>
              {a.discordAuthorName}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          value={from}
          onChange={handleFilterChange(setFrom)}
          width="160px"
          placeholder="From"
        />
        <Input
          type="date"
          value={to}
          onChange={handleFilterChange(setTo)}
          width="160px"
          placeholder="To"
        />
      </HStack>

      {/* List */}
      {loading ? (
        <Flex justifyContent="center" padding="2rem">
          <Spinner />
        </Flex>
      ) : chores.length === 0 ? (
        <Text color="gray.500">No chores found.</Text>
      ) : (
        <VStack alignItems="stretch" gap="0.5rem">
          {chores.map((chore) =>
            editingId === chore.id ? (
              <ChoreEditRow
                key={chore.id}
                form={editForm}
                onChange={setEditForm}
                onSave={() => saveEdit(chore.id)}
                onCancel={cancelEdit}
              />
            ) : (
              <ChoreRow
                key={chore.id}
                chore={chore}
                onEdit={() => startEdit(chore)}
                onRescan={() => handleRescan(chore.choreMessage.id)}
                isRescanning={rescanningMessageId === chore.choreMessage.id}
              />
            ),
          )}
        </VStack>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <HStack justifyContent="center" gap="1rem">
          <Button
            size="sm"
            onClick={() => setPage((p) => p - 1)}
            isDisabled={page <= 1}
          >
            Previous
          </Button>
          <Text fontSize="sm">
            {page} / {totalPages}
          </Text>
          <Button
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            isDisabled={page >= totalPages}
          >
            Next
          </Button>
        </HStack>
      )}
    </VStack>
  )
}

function ChoreRow({
  chore,
  onEdit,
  onRescan,
  isRescanning,
}: {
  chore: ChoreItem
  onEdit: () => void
  onRescan: () => void
  isRescanning: boolean
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
      <Text fontSize="sm" color="gray.400">
        {chore.choreMessage.discordAuthorName}
      </Text>
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

function ChoreEditRow({
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
