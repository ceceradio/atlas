const BASE = `https://${process.env.NEXT_PUBLIC_DOMAIN}/api`

export type ChoreMessageItem = {
  id: string
  discordMessageId: string
  discordAuthorId: string
  discordAuthorName: string
  content: string | null
  postedAt: string
  editedAt: string | null
  createdAt: string
  choreCount: number
}

export type ChoreMessagesResponse = {
  data: ChoreMessageItem[]
  total: number
  page: number
  limit: number
}

export async function getChoreMessages(
  token: string,
  params: {
    page?: number
    limit?: number
    discordAuthorId?: string
    from?: string
    to?: string
    noChores?: boolean
  } = {},
): Promise<ChoreMessagesResponse> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.discordAuthorId) query.set('discordAuthorId', params.discordAuthorId)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)
  if (params.noChores) query.set('noChores', 'true')

  const response = await fetch(`${BASE}/chore-messages?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export type ChoreAuthor = {
  discordAuthorId: string
  discordAuthorName: string
}

export type ChoreItem = {
  id: string
  description: string
  doneAt: string
  difficulty: string
  aiOriginal: {
    description: string
    doneAt: string
    difficulty: string
  }
  choreMessage: {
    id: string
    discordMessageId: string
    discordAuthorId: string
    discordAuthorName: string
    postedAt: string
    editedAt: string | null
  }
}

export type ChoresResponse = {
  data: ChoreItem[]
  total: number
  page: number
  limit: number
}

export async function getAuthors(token: string): Promise<ChoreAuthor[]> {
  const response = await fetch(`${BASE}/chores/authors`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export async function getChores(
  token: string,
  params: {
    page?: number
    limit?: number
    discordAuthorId?: string
    from?: string
    to?: string
  } = {},
): Promise<ChoresResponse> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.limit) query.set('limit', String(params.limit))
  if (params.discordAuthorId) query.set('discordAuthorId', params.discordAuthorId)
  if (params.from) query.set('from', params.from)
  if (params.to) query.set('to', params.to)

  const response = await fetch(`${BASE}/chores?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export async function reprocessChoreMessage(
  token: string,
  choreMessageId: string,
): Promise<{ jobId: string | number }> {
  const response = await fetch(`${BASE}/chore-message/${choreMessageId}/reprocess`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export type DiscordMessage = {
  id: string
  channelId: string
  content: string
  authorId: string
  authorName: string
  createdAt: string
  editedAt: string | null
  imported: boolean
}

export async function getDiscordChannelMessages(
  token: string,
  channelId: string,
  params: { before?: string; limit?: number } = {},
): Promise<DiscordMessage[]> {
  const query = new URLSearchParams()
  if (params.before) query.set('before', params.before)
  if (params.limit) query.set('limit', String(params.limit))
  const response = await fetch(`${BASE}/discord/channel/${channelId}/messages?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.json()
}

export async function bulkProcessChoreMessages(
  token: string,
  messages: { discordMessageId: string; discordChannelId: string }[],
): Promise<{ queued: number; ids: (string | number)[] }> {
  const response = await fetch(`${BASE}/chore-messages/bulk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(messages),
  })
  return response.json()
}

export async function updateChore(
  token: string,
  id: string,
  patch: { description?: string; doneAt?: string; difficulty?: string },
): Promise<ChoreItem> {
  const response = await fetch(`${BASE}/chore/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })
  return response.json()
}
