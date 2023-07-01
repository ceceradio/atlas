import { ConversationAPI, openingMessages } from '@/atlas-api'
import { AppDataSource } from '@/data-source'
import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { Organization } from '@/entity/Organization'
import { User } from '@/entity/User'
import express from 'express'

export const conversationApp = express()

conversationApp.post('/conversation', async (request, response) => {
  const { data, status } = await ConversationAPI.answerPrompt()
  if (status != 200) {
    console.error(data)
    throw new Error()
  }
  if (!data.choices[0].message) {
    throw new Error('no message returned')
  }
  const { content } = data.choices[0].message
  let organization = AppDataSource.getRepository(Organization).create()
  organization = await AppDataSource.getRepository(Organization).save(
    organization,
  )
  let creator = AppDataSource.getRepository(User).create({
    organization,
  })
  creator = await AppDataSource.getRepository(User).save(creator)
  const conversation = AppDataSource.getRepository(Conversation).create({
    creator,
    organization,
  })
  await AppDataSource.getRepository(Conversation).save(conversation)
  const message = AppDataSource.getRepository(Message).create({
    conversation,
    author: null,
    content,
  })
  await AppDataSource.getRepository(Message).save(message)
  return response.json({ message, conversation })
})

conversationApp.patch('/conversation', async (request, response) => {
  // validate input
  const { uuid, content }: { uuid: string; content: string } =
    await request.body
  if (!content) throw new Error('content empty')
  // look up prior conversation
  const [conversation] = await AppDataSource.getRepository(Conversation).find({
    where: { uuid },
    order: {
      created: 'ASC',
    },
    relations: {
      messages: true,
    },
  })
  if (!conversation) throw new Error()
  // create message from user and save to database
  const message = await AppDataSource.getRepository(Message).create({
    author: conversation.creator,
    content,
  })
  AppDataSource.getRepository(Message).save(message)
  const messages = openingMessages.concat(
    conversation.messages.map((message) => message.toOpenAI()),
    [message.toOpenAI()],
  )
  const { data, status } = await ConversationAPI.answerPrompt(messages)
  if (status != 200) {
    console.error(data)
    throw new Error()
  }
  if (!data.choices[0].message) {
    throw new Error('no message returned')
  }

  const { content: atlasContent } = data.choices[0].message
  const atlasMessage = AppDataSource.getRepository(Message).create({
    conversation,
    author: null,
    content: atlasContent,
  })
  await AppDataSource.getRepository(Message).save(atlasMessage)
  return response.json({ atlasMessage, messages })
})
