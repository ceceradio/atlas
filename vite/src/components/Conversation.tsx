import ReactMarkdown from 'react-markdown'
import useAtlasSocket from '@/helpers/useAtlasSocket'
import {
  useGetConversationQuery,
  useCreateConversationMutation,
  useCreateMessageMutation,
} from '@/store/atlasApi'
import { selectToken } from '@/store/authSlice'
import {
  ChatMessage,
  IAPIConversation,
  Snapshot,
} from '@atlas/api'

type ConversationMessage = IAPIConversation['messages'][number] & { uuid?: string }
import {
  Box,
  Button,
  HStack,
  Heading,
  Skeleton,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'
import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

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
  const token = useSelector(selectToken)
  const { sendJsonMessage, lastJsonMessage } = useAtlasSocket()
  const navigate = useNavigate()

  const { data: conversation, isLoading: conversationLoading } = useGetConversationQuery(uuid!, {
    skip: !token || !uuid,
  })
  const [createConversationMutation] = useCreateConversationMutation()
  const [createMessageMutation] = useCreateMessageMutation()

  const prevUuidRef = useRef('')
  useEffect(() => {
    if (uuid && token && prevUuidRef.current !== uuid) {
      prevUuidRef.current = uuid
      setStreamingContent(null)
      setPendingUserMessage(null)
      sendJsonMessage({ type: 'joined', conversationId: uuid })
    }
  }, [uuid, token, sendJsonMessage])

  useEffect(() => {
    if (!lastJsonMessage) return
    const msg = lastJsonMessage as { type: string } & Snapshot & ChatMessage
    if (msg.conversationId !== uuid) return
    if (msg.type === 'snapshot') setStreamingContent(msg.snapshot)
    if (msg.type === 'message' && msg.role === 'user') setPendingUserMessage({ name: msg.name, content: msg.content })
  }, [lastJsonMessage, uuid])

  const onSubmit = async () => {
    setIsLoadingMessage(true)
    setContent('')
    try {
      if (!uuid) {
        const { uuid: newUuid } = await createConversationMutation(content).unwrap()
        navigate(`/zone/conversation/${newUuid}`)
      } else {
        await createMessageMutation({ uuid, content }).unwrap()
        setStreamingContent(null)
        setPendingUserMessage(null)
      }
    } finally {
      setIsLoadingMessage(false)
    }
  }

  if (uuid && conversationLoading) return <LoadingConversation />

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
  messages: ConversationMessage[]
}) {
  return (
    <>
      {messages &&
        messages.map((message, index) => {
          const msg = message as { name?: string; content?: string; role: string; uuid?: string }
          const { name, uuid, role, content } = msg
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
