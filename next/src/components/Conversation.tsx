import {
  createConversation,
  createMessage,
  getConversation,
} from '@/client/conversations'
import ReactMarkdown from 'react-markdown'
import useAtlasApi from '@/helpers/useAtlasApi'
import useAtlasSocket from '@/helpers/useAtlasSocket'
import {
  ChatMessage,
  ChatCompletionRequestMessageWithUuid,
  IAPIConversation,
  Snapshot,
} from '@atlas/api'
import {
  Box,
  Button,
  HStack,
  Heading,
  Skeleton,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'

export type MessageProps = {
  name: string
  content: string
  role: string
}

export function FalseConversation() {
  return (
    <Message
      name="Atlas"
      role="assistant"
      content="I have a new sequence I have been meaning to show you, Paul."
    />
  )
}

export function Message({ name, role, content }: MessageProps) {
  return (
    <Box>
      <strong>{name || role}</strong>:{' '}
      <ReactMarkdown>{content}</ReactMarkdown>
    </Box>
  )
}

type ConversationPanelProps = {
  uuid?: string
}

export function ConversationPanel({ uuid }: ConversationPanelProps) {
  const [isLoadingMessage, setIsLoadingMessage] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string | null>(null)
  const [pendingUserMessage, setPendingUserMessage] = useState<{ name: string; content: string } | null>(null)
  const [content, setContent] = useState('')
  const [conversation, setConversation] = useState<IAPIConversation>()
  const { token } = useAtlasApi()
  const { sendJsonMessage, lastJsonMessage } = useAtlasSocket()
  const lastFetchedUuid = useRef('')
  const router = useRouter()

  useEffect(() => {
    if (token && uuid && lastFetchedUuid.current !== uuid) {
      lastFetchedUuid.current = uuid
      setConversation(undefined)
      setStreamingContent(null)
      setPendingUserMessage(null)
      getConversation(token, uuid)
        .then(setConversation)
        .then(() => sendJsonMessage({ type: 'joined', conversationId: uuid }))
    }
  }, [token, sendJsonMessage, uuid])

  useEffect(() => {
    if (!lastJsonMessage) return
    const msg = lastJsonMessage as { type: string } & Snapshot & ChatMessage
    if (msg.conversationId !== uuid) return
    if (msg.type === 'snapshot') setStreamingContent(msg.snapshot)
    if (msg.type === 'message' && msg.role === 'user') setPendingUserMessage({ name: msg.name, content: msg.content })
  }, [lastJsonMessage, uuid])

  const onSubmit = () => {
    setIsLoadingMessage(true)
    setContent('')
    if (!uuid) {
      createConversation(token, content)
        .then(({ uuid }) => router.push(`/zone/conversation/${uuid}`))
        .finally(() => setIsLoadingMessage(false))
    } else {
      createMessage(token, uuid, content)
        .then((conv) => {
          setStreamingContent(null)
          setPendingUserMessage(null)
          setConversation(conv)
        })
        .finally(() => setIsLoadingMessage(false))
    }
  }

  if (uuid && !conversation) return <LoadingConversation />

  return (
    <ConversatonPanelDisplay
      conversation={conversation}
      isLoadingMessage={isLoadingMessage}
      streamingContent={streamingContent}
      pendingUserMessage={pendingUserMessage}
      onSubmit={onSubmit}
      content={content}
      setContent={setContent}
    />
  )
}

export const LoadingConversation = () => (
  <Box>
    <Skeleton h="20px" m="1rem" />
    <Skeleton h="20px" m="1rem" />
    <Skeleton h="20px" m="1rem" />
    <Skeleton h="20px" m="1rem" />
  </Box>
)

type ConversationPanelDisplayProps = {
  conversation: IAPIConversation | undefined
  isLoadingMessage: boolean
  streamingContent: string | null
  pendingUserMessage: { name: string; content: string } | null
  onSubmit: () => void
  content: string
  setContent: Dispatch<SetStateAction<string>>
}
function ConversatonPanelDisplay({
  conversation,
  isLoadingMessage,
  streamingContent,
  pendingUserMessage,
  onSubmit,
  content,
  setContent,
}: ConversationPanelDisplayProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages, streamingContent, pendingUserMessage, isLoadingMessage])

  return (
    <VStack
      padding={{ base: '0.75rem', md: '1rem' }}
      height={{ base: 'calc(100vh - 48px)', md: '100vh' }}
      alignItems="stretch"
    >
      <Box flex="1" overflowY="auto" minHeight={0}>
        {conversation ? (
          <>
            <Heading fontSize={{ base: '1.5rem', md: '2rem' }} mb="0.5rem">
              {conversation.title}
            </Heading>
            {conversation.messages && (
              <Messages messages={conversation.messages} />
            )}
            {pendingUserMessage && (
              <Message name={pendingUserMessage.name} role="user" content={pendingUserMessage.content} />
            )}
            {streamingContent && (
              <Message name="Atlas" role="assistant" content={streamingContent} />
            )}
            {isLoadingMessage && !streamingContent && <ThinkingMessage />}
          </>
        ) : (
          <FalseConversation />
        )}
        <div ref={bottomRef} />
      </Box>
      <HStack w="100%" alignItems="flex-end" flexShrink={0}>
        <Textarea
          flex="1"
          placeholder="What's new?"
          name="content"
          value={content}
          rows={3}
          onChange={(event) => setContent(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              onSubmit()
            }
          }}
        />
        <Button type="submit" onClick={onSubmit}>
          Send
        </Button>
      </HStack>
    </VStack>
  )
}

function ThinkingMessage() {
  return (
    <HStack>
      <Box>
        <strong>Atlas: </strong>
      </Box>
      <HStack gap="4px" alignItems="center">
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            width="7px"
            height="7px"
            borderRadius="full"
            background="gray.400"
            style={{
              animation: 'atlas-thinking 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </HStack>
    </HStack>
  )
}

function Messages({
  messages,
}: {
  messages: ChatCompletionRequestMessageWithUuid[]
}) {
  return (
    <>
      {messages &&
        messages.map((message, index) => {
          const { name, uuid, role, content } = message
          return (
            <div className={uuid} key={uuid || index}>
              <Box>
                <Message
                  name={name || ''}
                  role={role}
                  content={content || ''}
                />
              </Box>
            </div>
          )
        })}
    </>
  )
}
