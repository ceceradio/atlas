import {
  useGetChoreMessagesQuery,
  useGetChoresQuery,
  useGetAuthorsQuery,
  useReprocessChoreMessageMutation,
  useUpdateChoreMutation,
  ChoreMessageItem,
  ChoreItem,
  ChoreAuthor,
} from '@/store/atlasApi'
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  Input,
  Select,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'

import { useState } from 'react'
import { useJobPoller } from '@/helpers/useJobPoller'
import { useChoreDateRange } from '@/helpers/useChoreDateRange'
import { useReduxString } from '@/helpers/useReduxString'
import { ChoreRow, ChoreEditRow, EditForm } from './ChoreRowShared'
import { ChoreReactionList } from './ChoreReactionList'
import { EXCLUDED_REACTIONS } from './ChoreProfiles/constants'

const LIMIT = 20

function truncate(text: string, max = 120) {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
}

export function ChoreMessagesPanel() {
  const [page, setPage] = useState(1)
  const [authorId, setAuthorId] = useReduxString('chore-messages-author-id')
  const [search, setSearch] = useReduxString('chore-search')
  const [from, setFrom, to, setTo] = useChoreDateRange()
  const [noChores, setNoChores] = useState(false)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const jobPoller = useJobPoller()

  const { data, isLoading: loading, isFetching } = useGetChoreMessagesQuery({
    page,
    limit: LIMIT,
    discordAuthorId: authorId || undefined,
    from: from || undefined,
    to: to || undefined,
    noChores: noChores || undefined,
    search: search || undefined,
  })
  const messages = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / LIMIT)

  const { data: authors = [] } = useGetAuthorsQuery()
  const [reprocessChoreMessage] = useReprocessChoreMessageMutation()

  function handleFilterChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setter(e.target.value)
      setPage(1)
    }
  }

  async function handleRescan(id: string) {
    const result = await reprocessChoreMessage(id).unwrap()
    jobPoller.start(id, result.jobId)
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <VStack padding="1.5rem" alignItems="stretch" gap="1rem">
      <Box background="white" borderRadius="lg" boxShadow="sm" padding="1.25rem">
        <Text fontSize="xl" fontWeight="bold" marginBottom="0.75rem">Chore Messages</Text>
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
          />
          <Input
            type="date"
            value={to}
            onChange={handleFilterChange(setTo)}
            width="160px"
          />
          <Input
            value={search}
            onChange={handleFilterChange(setSearch)}
            placeholder="Search content…"
            width="220px"
          />
          <Checkbox
            isChecked={noChores}
            onChange={(e) => { setNoChores(e.target.checked); setPage(1) }}
          >
            No chores only
          </Checkbox>
        </HStack>
      </Box>

      {/* List */}
      {loading ? (
        <Flex justifyContent="center" padding="2rem">
          <Spinner />
        </Flex>
      ) : messages.length === 0 && !isFetching ? (
        <Text color="gray.500">No messages found.</Text>
      ) : (
        <VStack alignItems="stretch" gap="0.5rem">
          {(messages as ChoreMessageItem[]).map((msg) => (
            <Box key={msg.id}>
              <ChoreMessageRow
                message={msg}
                onRescan={() => handleRescan(msg.id)}
                isRescanning={jobPoller.isRunning(msg.id)}
                expanded={expandedIds.has(msg.id)}
                onToggleExpand={() => toggleExpanded(msg.id)}
              />
              {expandedIds.has(msg.id) && (
                <MessageChores message={msg} />
              )}
            </Box>
          ))}
        </VStack>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <HStack justifyContent="center" gap="1rem">
          <Button size="sm" onClick={() => setPage((p) => p - 1)} isDisabled={page <= 1}>
            Previous
          </Button>
          <Text fontSize="sm">{page} / {totalPages}</Text>
          <Button size="sm" onClick={() => setPage((p) => p + 1)} isDisabled={page >= totalPages}>
            Next
          </Button>
        </HStack>
      )}
    </VStack>
  )
}

function ChoreMessageRow({
  message,
  onRescan,
  isRescanning,
  expanded,
  onToggleExpand,
}: {
  message: ChoreMessageItem
  onRescan: () => void
  isRescanning: boolean
  expanded: boolean
  onToggleExpand: () => void
}) {
  const canExpand = message.choreCount > 0

  return (
    <Flex
      padding="0.75rem 1rem"
      background="gray.50"
      borderRadius={expanded ? 'md md 0 0' : 'md'}
      alignItems="center"
      gap="1rem"
      flexWrap="wrap"
      onClick={canExpand ? onToggleExpand : undefined}
      cursor={canExpand ? 'pointer' : 'default'}
      _hover={canExpand ? { background: 'gray.100' } : undefined}
    >
      <Text fontSize="sm" color="gray.400" flexShrink={0} width="16px" textAlign="center">
        {canExpand ? (expanded ? '▲' : '▼') : ''}
      </Text>
      <Text fontSize="sm" color="gray.500" minWidth="90px" flexShrink={0}>
        {new Date(message.postedAt).toLocaleDateString(undefined, { timeZone: 'America/New_York' })}
      </Text>
      <Text fontSize="sm" color="gray.600" minWidth="100px" flexShrink={0}>
        {message.discordAuthorName}
      </Text>
      <Box flex="1" minWidth={0}>
        {message.content ? (
          <Text fontSize="sm" color="gray.800" noOfLines={1}>
            {truncate(message.content)}
          </Text>
        ) : (
          <Text fontSize="sm" color="gray.400" fontStyle="italic">
            No content stored
          </Text>
        )}
      </Box>
      <Badge
        colorScheme={message.choreCount === 0 ? 'red' : 'green'}
        flexShrink={0}
      >
        {message.choreCount} {message.choreCount === 1 ? 'chore' : 'chores'}
      </Badge>
      {message.notAChoreCount > 0 && (
        <Badge colorScheme="gray" variant="subtle" flexShrink={0}>
          {message.notAChoreCount} not a chore
        </Badge>
      )}
      <Button
        size="xs"
        colorScheme="orange"
        variant="ghost"
        onClick={(e) => { e.stopPropagation(); onRescan() }}
        isLoading={isRescanning}
        flexShrink={0}
      >
        Rescan
      </Button>
    </Flex>
  )
}

function MessageChores({ message: { id: choreMessageId, content, postedAt, editedAt, reactions } }: { message: ChoreMessageItem }) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ description: '', doneAt: '', difficulty: '' })
  const jobPoller = useJobPoller()
  const [updateChore] = useUpdateChoreMutation()
  const [reprocessChoreMessage] = useReprocessChoreMessageMutation()

  const { data, isFetching } = useGetChoresQuery({ choreMessageId, limit: 100 })
  const chores = data?.data ?? []

  function startEdit(chore: ChoreItem) {
    setEditingId(chore.id)
    setEditForm({ description: chore.description, doneAt: chore.doneAt, difficulty: chore.difficulty })
  }

  async function saveEdit(id: string) {
    await updateChore({ id, patch: editForm }).unwrap()
    setEditingId(null)
  }

  async function handleRescan(chore: ChoreItem) {
    const result = await reprocessChoreMessage(chore.choreMessage.id).unwrap()
    jobPoller.start(chore.choreMessage.id, result.jobId)
  }

  return (
    <Box
      borderLeft="1px solid"
      borderRight="1px solid"
      borderBottom="1px solid"
      borderColor="gray.200"
      borderRadius="0 0 md md"
      background="white"
    >
      <Box
        padding="0.75rem 1rem"
        borderBottom="1px solid"
        borderColor="gray.100"
        background="gray.50"
      >
        {content && (
          <Text fontSize="sm" color="gray.700" whiteSpace="pre-wrap" mb="0.5rem">{content}</Text>
        )}
        <HStack gap="1rem" flexWrap="wrap" alignItems="center">
          <Text fontSize="xs" color="gray.400">
            sent {new Date(postedAt).toLocaleString(undefined, { timeZone: 'America/New_York' })}
          </Text>
          {editedAt && (
            <Text fontSize="xs" color="gray.400">
              edited {new Date(editedAt).toLocaleString(undefined, { timeZone: 'America/New_York' })}
            </Text>
          )}
          <ChoreReactionList reactions={reactions} size="sm" exclude={EXCLUDED_REACTIONS} />
        </HStack>
      </Box>
      {isFetching ? (
        <Flex justifyContent="center" padding="1rem">
          <Spinner size="sm" />
        </Flex>
      ) : chores.length === 0 ? (
        <Text padding="1rem" fontSize="sm" color="gray.400">No chores found.</Text>
      ) : (
        <VStack alignItems="stretch" gap="0" padding="0.5rem">
          {chores.map((chore) =>
            editingId === chore.id ? (
              <ChoreEditRow
                key={chore.id}
                form={editForm}
                onChange={setEditForm}
                onSave={() => saveEdit(chore.id)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <ChoreRow
                key={chore.id}
                chore={chore}
                showAuthor={false}
                onEdit={() => startEdit(chore)}
                onRescan={() => handleRescan(chore)}
                isRescanning={jobPoller.isRunning(chore.choreMessage.id)}
              />
            )
          )}
        </VStack>
      )}
    </Box>
  )
}
