import {
  useGetChoreMessagesQuery,
  useGetAuthorsQuery,
  useReprocessChoreMessageMutation,
  ChoreMessageItem,
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

const LIMIT = 20

function truncate(text: string, max = 120) {
  return text.length <= max ? text : text.slice(0, max).trimEnd() + '…'
}

export function ChoreMessagesPanel() {
  const [page, setPage] = useState(1)
  const [authorId, setAuthorId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [noChores, setNoChores] = useState(false)
  const [rescanningId, setRescanningId] = useState<string | null>(null)

  const { data, isFetching: loading } = useGetChoreMessagesQuery({
    page,
    limit: LIMIT,
    discordAuthorId: authorId || undefined,
    from: from || undefined,
    to: to || undefined,
    noChores: noChores || undefined,
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
    setRescanningId(id)
    try {
      await reprocessChoreMessage(id).unwrap()
    } finally {
      setRescanningId(null)
    }
  }

  return (
    <VStack padding="1.5rem" alignItems="stretch" gap="1rem">
      <Text fontSize="xl" fontWeight="bold">Chore Messages</Text>

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
        />
        <Input
          type="date"
          value={to}
          onChange={handleFilterChange(setTo)}
          width="160px"
        />
        <Checkbox
          isChecked={noChores}
          onChange={(e) => { setNoChores(e.target.checked); setPage(1) }}
        >
          No chores only
        </Checkbox>
      </HStack>

      {/* List */}
      {loading ? (
        <Flex justifyContent="center" padding="2rem">
          <Spinner />
        </Flex>
      ) : messages.length === 0 ? (
        <Text color="gray.500">No messages found.</Text>
      ) : (
        <VStack alignItems="stretch" gap="0.5rem">
          {(messages as ChoreMessageItem[]).map((msg) => (
            <ChoreMessageRow
              key={msg.id}
              message={msg}
              onRescan={() => handleRescan(msg.id)}
              isRescanning={rescanningId === msg.id}
            />
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
}: {
  message: ChoreMessageItem
  onRescan: () => void
  isRescanning: boolean
}) {
  return (
    <Flex
      padding="0.75rem 1rem"
      background="gray.50"
      borderRadius="md"
      alignItems="center"
      gap="1rem"
      flexWrap="wrap"
    >
      <Text fontSize="sm" color="gray.500" minWidth="90px" flexShrink={0}>
        {new Date(message.postedAt).toLocaleDateString()}
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
      <Button
        size="xs"
        colorScheme="orange"
        variant="ghost"
        onClick={onRescan}
        isLoading={isRescanning}
        flexShrink={0}
      >
        Rescan
      </Button>
    </Flex>
  )
}
