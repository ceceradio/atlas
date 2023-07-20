import { AtlasError } from '@/app/errors'
import { AtlasAPI } from '@/atlas'
import { postgres } from '@/data-source'
import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { User } from '@/entity/User'
import { IAPIConversation } from '@/interface/Conversation'
import { retitleQueue } from '@/queue/retitle'
import express from 'express'
import { authorize } from './authorize'

export const conversationApp = express()
conversationApp.use(authorize)

const atlasApi = new AtlasAPI()

conversationApp.get('/conversations', async (request, response) => {
  const { user } = response.locals
  if (!user) return response.status(400)
  const conversations = await Conversation.listByCreator(postgres, user)

  return response.json(conversations)
})

conversationApp.get('/conversation/:uuid', async (request, response) => {
  // validate input @todo
  const { uuid } = request.params
  // look up prior conversation
  const conversation = await Conversation.get(postgres, uuid)
  if (!conversation) return response.status(404)
  return response.json(atlasApi.withOpeningMessages(conversation))
})

type ConversationPatchBody = { content: string }
conversationApp.patch('/conversation/:uuid', async (request, response) => {
  const { content }: ConversationPatchBody = await request.body
  const { uuid } = request.params
  const { user } = response.locals
  if (!content || !uuid) return response.status(400)
  if (!user) return response.status(401)
  // look up prior conversation
  const conversation = await Conversation.get(postgres, uuid)
  if (!conversation) return response.status(404)
  // create message from user and save to database
  const data = await performChatExchange(content, user, conversation)
  // add background job
  retitleQueue.add({ uuid: conversation.uuid }, { delay: 1000 })
  return response.json(data)
})

type ConversationPostBody = { content: string }
conversationApp.post('/conversation', async (request, response) => {
  const { content }: ConversationPostBody = await request.body
  const { user } = response.locals
  if (!content) return response.status(400)
  if (!user) return response.status(401)

  // create a conversation and add the opening message to it
  const conversation = await Conversation.create(postgres, user)
  await openConversation(user, conversation)

  const data = await performChatExchange(content, user, conversation)
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
): Promise<IAPIConversation> {
  if (!user) throw new AtlasError()
  if (content)
    await Message.create(postgres, conversation, user, 'user', content)
  // refresh
  conversation = (await Conversation.get(
    postgres,
    conversation.uuid,
  )) as Conversation // guaranteed to exist

  await Message.create(
    postgres,
    conversation,
    user,
    'assistant',
    (await atlasApi.respondToConversation(conversation)).content || '',
  )
  // refresh
  conversation = (await Conversation.get(
    postgres,
    conversation.uuid,
  )) as Conversation // guaranteed to exist
  return atlasApi.withOpeningMessages(conversation)
}
