import {
  useGetOrganizationQuery,
  useGetDiscordChannelMessagesQuery,
  useLazyGetDiscordChannelMessagesQuery,
  useBulkProcessChoreMessagesMutation,
  DiscordMessage,
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
import { useEffect, useMemo, useState } from 'react'

function dateToSnowflake(date: Date): string {
  return (BigInt(date.getTime() - 1420070400000) << 22n).toString()
}

export function ChoreImportPanel() {
  const [allMessages, setAllMessages] = useState<DiscordMessage[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitResult, setSubmitResult] = useState<string | null>(null)
  const [authorFilter, setAuthorFilter] = useState('')
  const [hideScanned, setHideScanned] = useState(false)
  const [jumpDate, setJumpDate] = useState('')

  const authors = useMemo(
    () => [...new Set(allMessages.map((m) => m.authorName))].sort(),
    [allMessages],
  )
  const visibleMessages = useMemo(
    () => allMessages.filter((m) => {
      if (authorFilter && m.authorName !== authorFilter) return false
      if (hideScanned && m.imported) return false
      return true
    }),
    [allMessages, authorFilter, hideScanned],
  )

  const { data: org } = useGetOrganizationQuery()
  const channelId = org?.settings?.discord?.choresChannelId ?? null

  const { data: initialMessages, isFetching: loading } = useGetDiscordChannelMessagesQuery(
    { channelId: channelId!, params: { limit: 50 } },
    { skip: !channelId },
  )

  const [loadMoreQuery, { isFetching: loadingMore }] = useLazyGetDiscordChannelMessagesQuery()
  const [bulkProcess, { isLoading: submitting }] = useBulkProcessChoreMessagesMutation()

  useEffect(() => {
    if (initialMessages) setAllMessages(initialMessages as DiscordMessage[])
  }, [initialMessages])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    const visibleIds = new Set(visibleMessages.map((m) => m.id))
    const allVisibleSelected = visibleMessages.every((m) => selected.has(m.id))
    if (allVisibleSelected) {
      setSelected((prev) => { const next = new Set(prev); visibleIds.forEach((id) => next.delete(id)); return next })
    } else {
      setSelected((prev) => new Set([...prev, ...visibleIds]))
    }
  }

  async function loadMore() {
    if (!channelId || allMessages.length === 0) return
    const oldest = allMessages[allMessages.length - 1].id
    const more = await loadMoreQuery({ channelId, params: { before: oldest, limit: 50 } }).unwrap()
    setAllMessages((prev) => [...prev, ...(more as DiscordMessage[])])
  }

  async function jumpToDate() {
    if (!channelId || !jumpDate) return
    // Use start of next day so messages on jumpDate are included
    const d = new Date(jumpDate)
    d.setDate(d.getDate() + 1)
    const before = dateToSnowflake(d)
    const messages = await loadMoreQuery({ channelId, params: { before, limit: 50 } }).unwrap()
    setAllMessages(messages as DiscordMessage[])
    setSelected(new Set())
  }

  async function handleSubmit() {
    if (selected.size === 0) return
    setSubmitResult(null)
    const payload = [...selected].map((id) => {
      const msg = allMessages.find((m) => m.id === id)!
      return { discordMessageId: id, discordChannelId: msg.channelId }
    })
    const result = await bulkProcess(payload).unwrap()
    setSubmitResult(`Queued ${result.queued} message${result.queued === 1 ? '' : 's'} for processing.`)
    setSelected(new Set())
  }

  if (!channelId) {
    return (
      <VStack padding="1.5rem" alignItems="stretch">
        <Text color="gray.500">No chore channel configured. Set one in organization settings first.</Text>
      </VStack>
    )
  }

  const allVisibleSelected = visibleMessages.length > 0 && visibleMessages.every((m) => selected.has(m.id))

  return (
    <VStack padding="1.5rem" alignItems="stretch" gap="1rem">
      <Box background="white" borderRadius="lg" boxShadow="sm" padding="1.25rem">
        <Text fontSize="xl" fontWeight="bold" marginBottom="0.75rem">Import Chore Messages</Text>
        <HStack justifyContent="space-between" flexWrap="wrap" gap="0.5rem">
          <HStack gap="0.5rem">
            <Select
              size="sm"
              width="160px"
              value={authorFilter}
              onChange={(e) => setAuthorFilter(e.target.value)}
            >
              <option value="">All authors</option>
              {authors.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
            <Input
              type="date"
              size="sm"
              width="160px"
              value={jumpDate}
              onChange={(e) => setJumpDate(e.target.value)}
            />
            <Button size="sm" onClick={jumpToDate} isDisabled={!jumpDate} isLoading={loadingMore}>
              Jump
            </Button>
          </HStack>
          <HStack gap="0.75rem">
            <Checkbox isChecked={allVisibleSelected} onChange={toggleAll} isDisabled={visibleMessages.length === 0}>
              Select all
            </Checkbox>
            <Checkbox isChecked={hideScanned} onChange={(e) => setHideScanned(e.target.checked)}>
              Hide scanned
            </Checkbox>
          </HStack>
          <Button
            size="sm"
            colorScheme="blue"
            isDisabled={selected.size === 0}
            isLoading={submitting}
            onClick={handleSubmit}
          >
            Submit {selected.size > 0 ? `(${selected.size})` : ''}
          </Button>
        </HStack>
        {submitResult && (
          <Text color="green.600" fontSize="sm" marginTop="0.5rem">{submitResult}</Text>
        )}
      </Box>

      {loading ? (
        <Flex justifyContent="center" padding="2rem">
          <Spinner />
        </Flex>
      ) : allMessages.length === 0 ? (
        <Text color="gray.500">No messages found.</Text>
      ) : (
        <VStack alignItems="stretch" gap="0.25rem">
          {visibleMessages.map((msg) => (
            <DiscordMessageRow
              key={msg.id}
              message={msg}
              isSelected={selected.has(msg.id)}
              onToggle={() => toggleSelect(msg.id)}
            />
          ))}
        </VStack>
      )}

      {!loading && allMessages.length > 0 && (
        <Button size="sm" variant="ghost" isLoading={loadingMore} onClick={loadMore}>
          Load more
        </Button>
      )}
    </VStack>
  )
}

function DiscordMessageRow({
  message,
  isSelected,
  onToggle,
}: {
  message: DiscordMessage
  isSelected: boolean
  onToggle: () => void
}) {
  return (
    <Flex
      padding="0.6rem 1rem"
      background={isSelected ? 'blue.50' : 'gray.50'}
      borderRadius="md"
      alignItems="flex-start"
      gap="0.75rem"
      cursor="pointer"
      onClick={onToggle}
      _hover={{ background: isSelected ? 'blue.100' : 'gray.100' }}
    >
      <Checkbox isChecked={isSelected} onChange={onToggle} onClick={(e) => e.stopPropagation()} mt="2px" />
      <Box flex="1" minWidth={0}>
        <HStack gap="0.5rem" mb="0.2rem">
          <Text fontSize="sm" fontWeight="semibold">{message.authorName}</Text>
          <Text fontSize="xs" color="gray.400">
            {new Date(message.createdAt).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/New_York',
            })}
          </Text>
          {!message.imported && (
            <Badge colorScheme="yellow" fontSize="xs">Not scanned</Badge>
          )}
        </HStack>
        <Text fontSize="sm" color="gray.700" noOfLines={3} whiteSpace="pre-wrap">
          {message.content || <Text as="span" color="gray.400" fontStyle="italic">No content</Text>}
        </Text>
      </Box>
    </Flex>
  )
}
