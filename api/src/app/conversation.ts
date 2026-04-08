import { AtlasError } from '@/app/errors'
import { Atlas } from '@/atlas/Atlas'
import { IAtlasAssistantMessage } from '@/atlas/IAtlas'
import { AtlasAssistant } from '@/atlas/assistants/Atlas/AtlasAssistant'
import { getDataSource, postgres } from '@/data-source'
import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { User } from '@/entity/User'
import { IAPIConversation } from '@/interface/Conversation'
import { retitleQueue } from '@/queue/retitle'
import { routeToOrganization } from '@/ws'
import express from 'express'
import { authorize } from './authorize'

export const conversationApp = express()
conversationApp.use(authorize)

conversationApp.get('/conversations', async (request, response) => {
  const db = await getDataSource()
  const { user } = response.locals
  if (!user) return response.sendStatus(400)
  const conversations = await Conversation.listByOrganization(
    db,
    user.organization,
  )
  response.json(conversations)
})

conversationApp.get('/conversation/:uuid', async (request, response) => {
  const { uuid } = request.params
  const db = await getDataSource()
  const conversation = await Conversation.get(db, uuid)
  if (!conversation) return response.sendStatus(404)
  return response.json(conversation.toApi())
})

type ConversationPatchBody = { content: string }
conversationApp.patch('/conversation/:uuid', async (request, response) => {
  const { content }: ConversationPatchBody = await request.body
  const { uuid } = request.params
  const { user } = response.locals
  if (!content || !uuid) return response.sendStatus(400)
  if (!user) return response.sendStatus(401)
  // look up prior conversation
  const db = await getDataSource()
  const conversation = await Conversation.get(db, uuid)
  if (!conversation) return response.sendStatus(404)
  // create message from user and save to database
  const data = await performChatExchange(
    content,
    user,
    conversation,
    user.organization.uuid,
  )
  // add background job
  retitleQueue.add({ uuid: conversation.uuid }, { delay: 1000 })
  return response.json(data)
})

type ConversationPostBody = { content: string }
conversationApp.post('/conversation', async (request, response) => {
  const { content }: ConversationPostBody = await request.body
  const { user } = response.locals
  if (!content) return response.sendStatus(400)
  if (!user) return response.sendStatus(401)
  const db = await getDataSource()
  // create a conversation and add the opening message to it
  const conversation = await Conversation.create(db, user)
  await openConversation(user, conversation)

  const data = await performChatExchange(
    content,
    user,
    conversation,
    user.organization.uuid,
  )
  // add background job
  retitleQueue.add({ uuid: conversation.uuid }, { delay: 1000 })

  return response.json(data)
})

async function openConversation(user: User, conversation: Conversation) {
  return performChatExchange('', user, conversation)
}

async function performChatExchange(
  content: string,
  user: User,
  conversation: Conversation,
  organizationUuid?: string,
): Promise<IAPIConversation> {
  const db = await getDataSource()
  if (!user) throw new AtlasError()
  if (content) {
    await Message.create(db, conversation, user, 'user', content)
    if (organizationUuid) {
      routeToOrganization(organizationUuid, {
        type: 'message' as const,
        conversationId: conversation.uuid,
        role: 'user',
        name: user.name,
        content,
      })
    }
  }
  // refresh
  conversation = (await Conversation.get(db, conversation.uuid)) as Conversation // guaranteed to exist

  const messages = conversation.messages.map((message) =>
    message.toAtlasMessage(),
  )

  const transceiver = organizationUuid
    ? {
        sendEvent: async (event: { type: 'snapshot'; snapshot: string }) => {
          routeToOrganization(organizationUuid, {
            type: 'snapshot' as const,
            conversationId: conversation.uuid,
            snapshot: event.snapshot,
          })
        },
      }
    : undefined

  const response = await Atlas.processRequest({
    messages,
    currentUser: {
      id: user.uuid,
      name: user.name,
    },
    assistant: AtlasAssistant,
    transceiver,
  })

  const assistantMessages = response.messages.filter(
    (message): message is IAtlasAssistantMessage =>
      ['assistant'].includes(message.role),
  )

  await Promise.all(
    assistantMessages.map((message) =>
      Message.create(
        postgres,
        conversation,
        user,
        'assistant',
        message.content,
        new Date(message.time),
      ),
    ),
  )
  // refresh
  conversation = (await Conversation.get(
    postgres,
    conversation.uuid,
  )) as Conversation // guaranteed to exist
  return conversation.toApi()
}
