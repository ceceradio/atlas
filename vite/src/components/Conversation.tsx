import ReactMarkdown from 'react-markdown'
import useAtlasSocket from '@/helpers/useAtlasSocket'
import { markSeen } from '@/helpers/useLastSeen'
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
  Flex,
  HStack,
  Heading,
  Skeleton,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Dispatch, SetStateAction, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSelector } from 'react-redux'

export type MessageProps = {
  name: string
  content: string
  role: string
  time?: number
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

export function Message({ name, role, content, time }: MessageProps) {
  const isUser = role === 'user'
  const timeString = (() => {
    if (!time) return null
    const d = new Date(time)
    const now = new Date()
    const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
    const timeStr = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    if (sameDay) return timeStr
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined }) + ' ' + timeStr
  })()
  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems={isUser ? 'flex-end' : 'flex-start'}
      marginBottom="0.75rem"
    >
      <Flex
        fontSize="xs"
        color="gray.500"
        marginBottom="0.2rem"
        paddingX="0.25rem"
        gap="0.4rem"
        alignItems="baseline"
      >
        {isUser && timeString && <Box color="gray.400">{timeString}</Box>}
        <Box>{name || role}</Box>
        {!isUser && timeString && <Box color="gray.400">{timeString}</Box>}
      </Flex>
      <Box
        background={isUser ? 'green.50' : 'white'}
        borderRadius="lg"
        boxShadow="sm"
        padding="0.6rem 0.9rem"
        maxWidth="80%"
        fontSize="sm"
        sx={{ 'ul, ol': { paddingLeft: '1.5rem' } }}
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </Box>
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
  const location = useLocation()

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

  useEffect(() => {
    if (!uuid || !conversation?.lastMessageAt) return
    markSeen(uuid, new Date(conversation.lastMessageAt).getTime())
  }, [uuid, conversation?.lastMessageAt])

  // Auto-send initial content passed via router state (from new conversation creation)
  const initialContentSentRef = useRef(false)
  useEffect(() => {
    const initialContent = (location.state as { initialContent?: string } | null)?.initialContent
    if (!uuid || !initialContent || initialContentSentRef.current) return
    initialContentSentRef.current = true
    window.history.replaceState({}, '')
    setIsLoadingMessage(true)
    createMessageMutation({ uuid, content: initialContent })
      .unwrap()
      .then(() => { setStreamingContent(null); setPendingUserMessage(null) })
      .finally(() => setIsLoadingMessage(false))
  }, [uuid, location.state])

  const onSubmit = async () => {
    setIsLoadingMessage(true)
    setContent('')
    try {
      if (!uuid) {
        const newConversation = await createConversationMutation().unwrap()
        navigate(`/zone/conversation/${newConversation.uuid}`, { state: { initialContent: content } })
      } else {
        await createMessageMutation({ uuid, content }).unwrap()
        setStreamingContent(null)
        setPendingUserMessage(null)
      }
    } finally {
      if (!uuid) return // loading state managed by auto-send effect after navigation
      setIsLoadingMessage(false)
    }
  }

  if (uuid && conversationLoading) return <LoadingConversation />

  return (
    <ConversatonPanelDisplay
      key={uuid}
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

  useLayoutEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation?.messages?.length, streamingContent, pendingUserMessage, isLoadingMessage])

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
          background="white"
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
          const msg = message as { name?: string; content?: string; role: string; uuid?: string; time?: number }
          const { name, uuid, role, content, time } = msg
          return (
            <div className={uuid} key={uuid || index}>
              <Box>
                <Message
                  name={name || ''}
                  role={role}
                  content={content || ''}
                  time={time}
                />
              </Box>
            </div>
          )
        })}
    </>
  )
}
