import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { IAPIConversation, IAPIOrganization, OrganizationSettings } from '@atlas/api'
import { selectToken } from './authSlice'

// ---- Types (moved from client/) ----------------------------------------

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
  limit: number
  page: number
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

export type DiscordChannel = {
  id: string
  name: string
  guildId: string
  guildName: string
}

// ---- Param types -----------------------------------------------------------

export type ChoreQueryParams = {
  page?: number
  limit?: number
  discordAuthorId?: string
  from?: string
  to?: string
}

export type ChoreMessageQueryParams = {
  page?: number
  limit?: number
  discordAuthorId?: string
  from?: string
  to?: string
  noChores?: boolean
}

export type DiscordChannelMessagesParams = {
  channelId: string
  params?: { before?: string; limit?: number }
}

// ---- API -------------------------------------------------------------------

export const atlasApi = createApi({
  reducerPath: 'atlasApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `https://${import.meta.env.VITE_DOMAIN}/api`,
    prepareHeaders: (headers, { getState }) => {
      const token = selectToken(getState() as { auth: { token: string } })
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  }),
  tagTypes: ['Conversation', 'Chores', 'ChoreMessages', 'Authors', 'Organization', 'DiscordChannels', 'DiscordMessages'],
  endpoints: (builder) => ({

    // -- Conversations -------------------------------------------------------

    getConversations: builder.query<IAPIConversation[], void>({
      query: () => '/conversations',
      providesTags: [{ type: 'Conversation', id: 'LIST' }],
    }),

    getConversation: builder.query<IAPIConversation, string>({
      query: (uuid) => `/conversation/${uuid}`,
      providesTags: (_result, _err, uuid) => [{ type: 'Conversation', id: uuid }],
    }),

    createConversation: builder.mutation<IAPIConversation, string>({
      query: (content) => ({
        url: '/conversation',
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: [{ type: 'Conversation', id: 'LIST' }],
    }),

    createMessage: builder.mutation<IAPIConversation, { uuid: string; content: string }>({
      query: ({ uuid, content }) => ({
        url: `/conversation/${uuid}`,
        method: 'PATCH',
        body: { content },
      }),
      invalidatesTags: (_result, _err, { uuid }) => [{ type: 'Conversation', id: uuid }],
    }),

    // -- Chores --------------------------------------------------------------

    getChores: builder.query<ChoresResponse, ChoreQueryParams>({
      query: (params = {}) => {
        const q = new URLSearchParams()
        if (params.page) q.set('page', String(params.page))
        if (params.limit) q.set('limit', String(params.limit))
        if (params.discordAuthorId) q.set('discordAuthorId', params.discordAuthorId)
        if (params.from) q.set('from', params.from)
        if (params.to) q.set('to', params.to)
        return `/chores?${q}`
      },
      providesTags: [{ type: 'Chores', id: 'LIST' }],
    }),

    getAuthors: builder.query<ChoreAuthor[], void>({
      query: () => '/chores/authors',
      providesTags: [{ type: 'Authors', id: 'LIST' }],
    }),

    updateChore: builder.mutation<ChoreItem, { id: string; patch: { description?: string; doneAt?: string; difficulty?: string } }>({
      query: ({ id, patch }) => ({
        url: `/chore/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: [{ type: 'Chores', id: 'LIST' }],
    }),

    reprocessChoreMessage: builder.mutation<{ jobId: string | number }, string>({
      query: (choreMessageId) => ({
        url: `/chore-message/${choreMessageId}/reprocess`,
        method: 'POST',
      }),
      invalidatesTags: [{ type: 'Chores', id: 'LIST' }, { type: 'ChoreMessages', id: 'LIST' }],
    }),

    // -- Chore messages ------------------------------------------------------

    getChoreMessages: builder.query<ChoreMessagesResponse, ChoreMessageQueryParams>({
      query: (params = {}) => {
        const q = new URLSearchParams()
        if (params.page) q.set('page', String(params.page))
        if (params.limit) q.set('limit', String(params.limit))
        if (params.discordAuthorId) q.set('discordAuthorId', params.discordAuthorId)
        if (params.from) q.set('from', params.from)
        if (params.to) q.set('to', params.to)
        if (params.noChores) q.set('noChores', 'true')
        return `/chore-messages?${q}`
      },
      providesTags: [{ type: 'ChoreMessages', id: 'LIST' }],
    }),

    getDiscordChannelMessages: builder.query<DiscordMessage[], DiscordChannelMessagesParams>({
      query: ({ channelId, params = {} }) => {
        const q = new URLSearchParams()
        if (params.before) q.set('before', params.before)
        if (params.limit) q.set('limit', String(params.limit))
        return `/discord/channel/${channelId}/messages?${q}`
      },
      providesTags: (_result, _err, { channelId }) => [{ type: 'DiscordMessages', id: channelId }],
    }),

    bulkProcessChoreMessages: builder.mutation<
      { queued: number; ids: (string | number)[] },
      { discordMessageId: string; discordChannelId: string }[]
    >({
      query: (messages) => ({
        url: '/chore-messages/bulk',
        method: 'POST',
        body: messages,
      }),
      invalidatesTags: [{ type: 'ChoreMessages', id: 'LIST' }],
    }),

    // -- Organization --------------------------------------------------------

    getOrganization: builder.query<IAPIOrganization, void>({
      query: () => '/organization',
      providesTags: [{ type: 'Organization', id: 'SINGLE' }],
    }),

    updateOrganizationSettings: builder.mutation<IAPIOrganization, OrganizationSettings>({
      query: (settings) => ({
        url: '/organization',
        method: 'PATCH',
        body: { settings },
      }),
      invalidatesTags: [{ type: 'Organization', id: 'SINGLE' }],
    }),

    getDiscordChannels: builder.query<DiscordChannel[], void>({
      query: () => '/discord/channels',
      providesTags: [{ type: 'DiscordChannels', id: 'LIST' }],
    }),
  }),
})

export const {
  useGetConversationsQuery,
  useGetConversationQuery,
  useCreateConversationMutation,
  useCreateMessageMutation,
  useGetChoresQuery,
  useGetAuthorsQuery,
  useUpdateChoreMutation,
  useReprocessChoreMessageMutation,
  useGetChoreMessagesQuery,
  useGetDiscordChannelMessagesQuery,
  useLazyGetDiscordChannelMessagesQuery,
  useBulkProcessChoreMessagesMutation,
  useGetOrganizationQuery,
  useUpdateOrganizationSettingsMutation,
  useGetDiscordChannelsQuery,
} = atlasApi
