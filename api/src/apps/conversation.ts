import AtlasAPI, { openingMessages } from '@/atlas'
import { AppDataSource } from '@/data-source'
import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { Organization } from '@/entity/Organization'
import { User } from '@/entity/User'
import express from 'express'

export const conversationApp = express()

function getFullOpenAIMessages(conversation: Conversation) {
  return openingMessages.concat(
    conversation.messages.map((message) => message.toOpenAI()),
  )
}

type ConversationPostBody = { content: string }
conversationApp.post('/conversation', async (request, response) => {
  const { content }: ConversationPostBody = await request.body
  const organization = await Organization.create(AppDataSource)
  const user = await User.create(AppDataSource, organization)

  // create a conversation and add the opening message to it
  const conversation = await Conversation.create(AppDataSource, user)
  await Message.create(AppDataSource, conversation, user, content)

  // get the full message string
  const messages = getFullOpenAIMessages(
    await Conversation.get(AppDataSource, conversation.uuid),
  )
  const atlasMessage = await Message.create(
    AppDataSource,
    conversation,
    null,
    await AtlasAPI.askToRespond(messages),
  )
  return response.json({
    messages: messages.concat(messages, [atlasMessage.toOpenAI()]),
    conversation,
  })
})

conversationApp.get('/conversation/:uuid', async (request, response) => {
  // validate input @todo
  const { uuid } = request.params
  // look up prior conversation
  const conversation = await Conversation.get(AppDataSource, uuid)
  const messages = getFullOpenAIMessages(conversation)

  return response.json({ conversation, messages })
})

type ConversationPatchBody = { content: string }
conversationApp.patch('/conversation/:uuid', async (request, response) => {
  // validate input @todo
  const { content }: ConversationPatchBody = await request.body
  const { uuid } = request.params
  if (!content)
    throw new Error('content of message in post body cannot be empty')
  // look up prior conversation
  const conversation = await Conversation.get(AppDataSource, uuid)
  // create message from user and save to database
  const message = await Message.create(
    AppDataSource,
    conversation,
    conversation.creator,
    content,
  )
  // create message array
  const messages = getFullOpenAIMessages(conversation).concat([
    message.toOpenAI(),
  ])
  const atlasMessage = await Message.create(
    AppDataSource,
    conversation,
    null,
    await AtlasAPI.askToRespond(messages),
  )
  return response.json({
    conversation,
    messages: messages.concat(messages, [atlasMessage.toOpenAI()]),
  })
})
