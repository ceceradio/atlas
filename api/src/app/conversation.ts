import { AtlasError } from '@/app/errors'
import AtlasAPI, { openingMessages } from '@/atlas'
import { postgres } from '@/data-source'
import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { IAPIConversation, IConversation } from '@/interface/Conversation'
import { IUser } from '@/interface/User'
import { retitleQueue } from '@/queue/retitle'
import express from 'express'
import { authorize } from './authorize'

export const conversationApp = express()
conversationApp.use(authorize)

function getFullOpenAIMessages(conversation: Conversation) {
  return openingMessages.concat(
    conversation.messages.map((message) => message.toOpenAI()),
  )
}

function wrapMessages(conversation: Conversation): IAPIConversation {
  return {
    ...conversation,
    messages: getFullOpenAIMessages(conversation),
  }
}

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
  return response.json(wrapMessages(conversation))
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
  // add background job
  retitleQueue.add({ uuid: conversation.uuid }, { delay: 5000 })
  // create message from user and save to database
  return response.json(await performChatExchange(content, user, conversation))
})

type ConversationPostBody = { content: string }
conversationApp.post('/conversation', async (request, response) => {
  const { content }: ConversationPostBody = await request.body
  const { user } = response.locals
  if (!content) return response.status(400)
  if (!user) return response.status(401)

  // create a conversation and add the opening message to it
  const conversation = await Conversation.create(postgres, user)
  // add background job
  retitleQueue.add({ uuid: conversation.uuid }, { delay: 5000 })
  await performChatExchange('', user, conversation)

  return response.json(await performChatExchange(content, user, conversation))
})

async function performChatExchange(
  content: string | null,
  user: IUser,
  conversation: IConversation,
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
    await AtlasAPI.askToRespond(getFullOpenAIMessages(conversation)),
  )
  // refresh
  conversation = (await Conversation.get(
    postgres,
    conversation.uuid,
  )) as Conversation // guaranteed to exist
  return wrapMessages(conversation)
}
