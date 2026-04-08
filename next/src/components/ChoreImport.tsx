'use client'
import {
  bulkProcessChoreMessages,
  DiscordMessage,
  getDiscordChannelMessages,
} from '@/client/chores'
import { getOrganization } from '@/client/organization'
import useAtlasApi from '@/helpers/useAtlasApi'
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
  const { token } = useAtlasApi()
  const [channelId, setChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DiscordMessage[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    getOrganization(token).then((org) => {
      setChannelId(org.settings?.discord?.choresChannelId ?? null)
    })
  }, [token])

  useEffect(() => {
    if (!token || !channelId) return
    setLoading(true)
    getDiscordChannelMessages(token, channelId, { limit: 50 })
      .then(setMessages)
      .finally(() => setLoading(false))
  }, [token, channelId])

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === messages.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(messages.map((m) => m.id)))
    }
  }

  async function loadMore() {
    if (!token || !channelId || messages.length === 0) return
    const oldest = messages[messages.length - 1].id
    setLoadingMore(true)
    getDiscordChannelMessages(token, channelId, { before: oldest, limit: 50 })
      .then((more) => setMessages((prev) => [...prev, ...more]))
      .finally(() => setLoadingMore(false))
  }

  async function handleSubmit() {
    if (!token || selected.size === 0) return
    setSubmitting(true)
    setSubmitResult(null)
    try {
      const payload = [...selected].map((id) => {
        const msg = messages.find((m) => m.id === id)!
        return { discordMessageId: id, discordChannelId: msg.channelId }
      })
      const result = await bulkProcessChoreMessages(token, payload)
      setSubmitResult(`Queued ${result.queued} message${result.queued === 1 ? '' : 's'} for processing.`)
      setSelected(new Set())
    } finally {
      setSubmitting(false)
    }
  }

  if (!channelId) {
    return (
      <VStack padding="1.5rem" alignItems="stretch">
        <Text color="gray.500">No chore channel configured. Set one in organization settings first.</Text>
      </VStack>
    )
  }

  const allSelected = messages.length > 0 && selected.size === messages.length

  return (
    <VStack padding="1.5rem" alignItems="stretch" gap="1rem">
      <Text fontSize="xl" fontWeight="bold">Import Chore Messages</Text>

      <HStack justifyContent="space-between">
        <Checkbox isChecked={allSelected} onChange={toggleAll} isDisabled={messages.length === 0}>
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
      ) : messages.length === 0 ? (
        <Text color="gray.500">No messages found.</Text>
      ) : (
        <VStack alignItems="stretch" gap="0.25rem">
          {messages.map((msg) => (
            <DiscordMessageRow
              key={msg.id}
              message={msg}
              isSelected={selected.has(msg.id)}
              onToggle={() => toggleSelect(msg.id)}
            />
          ))}
        </VStack>
      )}

      {!loading && messages.length > 0 && (
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
