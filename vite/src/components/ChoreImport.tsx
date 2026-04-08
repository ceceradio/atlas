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
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'

export function ChoreImportPanel() {
  const [allMessages, setAllMessages] = useState<DiscordMessage[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitResult, setSubmitResult] = useState<string | null>(null)

  const { data: org } = useGetOrganizationQuery()
  const channelId = org?.settings?.discord?.choresChannelId ?? null

  const { data: initialMessages = [], isFetching: loading } = useGetDiscordChannelMessagesQuery(
    { channelId: channelId!, params: { limit: 50 } },
    { skip: !channelId },
  )

  const [loadMoreQuery, { isFetching: loadingMore }] = useLazyGetDiscordChannelMessagesQuery()
  const [bulkProcess, { isLoading: submitting }] = useBulkProcessChoreMessagesMutation()

  useEffect(() => {
    setAllMessages(initialMessages as DiscordMessage[])
  }, [initialMessages])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === allMessages.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(allMessages.map((m) => m.id)))
    }
  }

  async function loadMore() {
    if (!channelId || allMessages.length === 0) return
    const oldest = allMessages[allMessages.length - 1].id
    const more = await loadMoreQuery({ channelId, params: { before: oldest, limit: 50 } }).unwrap()
    setAllMessages((prev) => [...prev, ...(more as DiscordMessage[])])
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

  const allSelected = allMessages.length > 0 && selected.size === allMessages.length

  return (
    <VStack padding="1.5rem" alignItems="stretch" gap="1rem">
      <Text fontSize="xl" fontWeight="bold">Import Chore Messages</Text>

      <HStack justifyContent="space-between">
        <Checkbox isChecked={allSelected} onChange={toggleAll} isDisabled={allMessages.length === 0}>
          Select all
        </Checkbox>
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
        <Text color="green.600" fontSize="sm">{submitResult}</Text>
      )}

      {loading ? (
        <Flex justifyContent="center" padding="2rem">
          <Spinner />
        </Flex>
      ) : allMessages.length === 0 ? (
        <Text color="gray.500">No messages found.</Text>
      ) : (
        <VStack alignItems="stretch" gap="0.25rem">
          {allMessages.map((msg) => (
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
              month: 'short', day: 'numeric', year: 'numeric',
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
