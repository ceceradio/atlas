import {
  createConversation,
  createMessage,
  getConversation,
} from '@/client/conversatons'
import { ChatCompletionRequestMessageWithUuid, IConversation } from '@atlas/api'
import { useAuth0 } from '@auth0/auth0-react'
import { Box, Button, HStack, Input, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'

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
  const [content, setContent] = useState('')
  const [conversation, setConversation] = useState<IConversation>()
  const { getAccessTokenSilently } = useAuth0()
  useEffect(() => {
    if (uuid)
      getAccessTokenSilently()
        .then((token) => getConversation(token, uuid))
        .then(setConversation)
  }, [getAccessTokenSilently, uuid])
  const onSubmit = () => {
    return getAccessTokenSilently()
      .then((token) =>
        uuid
          ? createMessage(token, uuid, content)
          : createConversation(token, content),
      )
      .then(setConversation)
  }
  return (
    <VStack>
      <Box>
        {conversation ? (
          <>
            <h2>{conversation.title}</h2>
            {conversation.messages && (
              <Messages messages={conversation.messages} />
            )}
          </>
        ) : (
          <FalseConversation />
        )}
      </Box>
      <Box>
        <HStack>
          <Input
            placeholder="What's new?"
            value={content}
            onChange={(event) => {
              setContent(event.target.value)
            }}
          />
          <Button type="submit" onClick={onSubmit}>
            Send
          </Button>
        </HStack>
      </Box>
    </VStack>
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
