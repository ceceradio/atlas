import {
  createConversation,
  createMessage,
  getConversation,
} from '@/client/conversatons'
import useAtlasApi from '@/helpers/useAtlasApi'
import useAtlasSocket from '@/helpers/useAtlasSocket'
import {
  ChatCompletionRequestMessageWithUuid,
  IAPIConversation,
} from '@atlas/api'
import {
  Box,
  Button,
  HStack,
  Heading,
  Input,
  Skeleton,
  VStack,
} from '@chakra-ui/react'
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
    <p>
      <strong>{name || role}</strong>: {content}
    </p>
  )
}

type ConversationPanelProps = {
  uuid?: string
}

export function ConversationPanel({ uuid }: ConversationPanelProps) {
  const [isLoadingMessage, setIsLoadingMessage] = useState(false)
  const [content, setContent] = useState('')
  const [conversation, setConversation] = useState<IAPIConversation>()
  const { token } = useAtlasApi()
  const { sendJsonMessage } = useAtlasSocket()
  const lastFetchedUuid = useRef('')

  useEffect(() => {
    if (token && uuid && lastFetchedUuid.current !== uuid) {
      lastFetchedUuid.current = uuid
      getConversation(token, uuid)
        .then(setConversation)
        .then(() => sendJsonMessage({ type: 'joined', conversationId: uuid }))
    }
  }, [token, sendJsonMessage, uuid])

  const onSubmit = () => {
    setIsLoadingMessage(true)
    return (
      uuid
        ? createMessage(token, uuid, content)
        : createConversation(token, content)
    )
      .then(setConversation)
      .finally(() => setIsLoadingMessage(false))
  }

  if (uuid && !conversation) return <LoadingConversation />

  return (
    <ConversatonPanelDisplay
      conversation={conversation}
      isLoadingMessage={isLoadingMessage}
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
  onSubmit: () => void
  content: string
  setContent: Dispatch<SetStateAction<string>>
}
function ConversatonPanelDisplay({
  conversation,
  isLoadingMessage,
  onSubmit,
  content,
  setContent,
}: ConversationPanelDisplayProps) {
  return (
    <VStack padding="1rem">
      <Box>
        {conversation ? (
          <>
            <Heading fontSize="2rem">{conversation.title}</Heading>
            {conversation.messages && (
              <Messages messages={conversation.messages} />
            )}
            {isLoadingMessage && <LoadingMessage />}
          </>
        ) : (
          <FalseConversation />
        )}
      </Box>
      <HStack w="100%">
        <Input
          flex="1"
          placeholder="What's new?"
          name="content"
          value={content}
          onChange={(event) => {
            setContent(event.target.value)
          }}
        />
        <Button type="submit" onClick={onSubmit}>
          Send
        </Button>
      </HStack>
    </VStack>
  )
}

function LoadingMessage() {
  return (
    <HStack>
      <Box>
        <strong>Atlas: </strong>
      </Box>
      <Skeleton h="20px" flex="1"></Skeleton>
    </HStack>
  )
}

function Messages({
  messages,
}: {
  messages: ChatCompletionRequestMessageWithUuid[]
}) {
  let untracked = 0
  return (
    <>
      {messages &&
        messages.map((message) => {
          const { name, uuid, role, content } = message
          return (
            <div className={uuid} key={uuid || untracked++}>
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
