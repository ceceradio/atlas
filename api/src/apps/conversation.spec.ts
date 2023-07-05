import { getDataSource } from '@/data-source'
import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { Organization } from '@/entity/Organization'
import { User } from '@/entity/User'

import request from 'supertest'

import { DataSource } from 'typeorm'
import { conversationApp } from './conversation'

let dataSource: DataSource

beforeEach(async () => {
  dataSource = await getDataSource()
})

describe('apps/conversation.ts/GET', () => {
  it('does things', async () => {
    const organization = await Organization.create(dataSource)
    const user = await User.create(dataSource, organization)
    const conversation = await Conversation.create(dataSource, user)
    await Message.create(dataSource, conversation, user, 'foobar')
    request(conversationApp)
      .get(`/conversation/${conversation.uuid}`)
      .expect(200)
  })
})

describe('apps/conversation.ts/POST', () => {
  it('does things', () => {
    expect(true).toBe(true)
  })
})

describe('apps/conversation.ts/PATCH', () => {
  it('does things', () => {
    expect(true).toBe(true)
  })
})
