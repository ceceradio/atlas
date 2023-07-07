import { ChatCompletionRequestMessageWithUuid, IConversation } from '@atlas/api'
import { useAuth0 } from '@auth0/auth0-react'
import { Box, Button, HStack, Input, VStack } from '@chakra-ui/react'
import { ChangeEventHandler, useEffect, useState } from 'react'

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
  const handleChange: ChangeEventHandler = (event) => {
    setContent(event.target.value)
  }
  return (
    <VStack>
      <Box>
        {conversation ? (
          <Box>
            <h2>{conversation.title}</h2>
            <Messages messages={conversation.messages} />
          </Box>
        ) : (
          <FalseConversation />
        )}
      </Box>
      <Box>
        <HStack>
          <Input
            placeholder="What's new?"
            value={content}
            onChange={handleChange}
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
  return (
    <>
      {messages &&
        messages.map((message) => {
          const { name, uuid, role, content } = message
          return (
            <Box key={uuid}>
              <Message name={name || ''} role={role} content={content || ''} />
            </Box>
          )
        })}
    </>
  )
}

export async function getConversation(
  token: string,
  uuid: string,
): Promise<IConversation> {
  const response = await fetch(
    `https://local.atlas.zone/api/conversation/${uuid}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  )
  return response.json()
}

export async function createMessage(
  token: string,
  uuid: string,
  content: string,
): Promise<IConversation> {
  const response = await fetch(
    `https://local.atlas.zone/api/conversation/${uuid}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ content }),
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    },
  )
  return response.json()
}

export async function getConversations(
  token: string,
): Promise<IConversation[]> {
  const response = await fetch('https://local.atlas.zone/api/conversations', {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export async function createConversation(
  token: string,
  content: string,
): Promise<IConversation> {
  const response = await fetch('https://local.atlas.zone/api/conversation', {
    method: 'POST',
    body: JSON.stringify({ content }),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  return response.json()
}
