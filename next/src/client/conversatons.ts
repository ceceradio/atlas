import { IConversation } from '@atlas/api'

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
