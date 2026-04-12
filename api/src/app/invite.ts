import { postgres } from '@/data-source'
import { User } from '@/entity/User'
import express from 'express'
import { Equal, Not } from 'typeorm'
import { authorize } from './authorize'

export const inviteManagementApp = express()
inviteManagementApp.use(authorize)

inviteManagementApp.post('/invite', async (request, response) => {
  const { name } = request.body
  if (!name || typeof name !== 'string') return response.sendStatus(400)

  const { user } = response.locals
  const org = user.organization

  const newUser = await User.create(postgres, org, name)
  return response.status(201).json({
    uuid: newUser.uuid,
    name: newUser.name,
    inviteCode: newUser.inviteCode,
    created: newUser.created,
  })
})

inviteManagementApp.get('/invites', async (request, response) => {
  const { user } = response.locals

  const pending = await postgres.getRepository(User).find({
    where: {
      organization: Equal(user.organization.uuid),
      inviteCode: Not(''),
    },
    relations: { authProfiles: true },
    order: { created: 'DESC' },
  })

  const result = pending
    .filter((u) => u.authProfiles.length === 0)
    .map((u) => ({
      uuid: u.uuid,
      name: u.name,
      inviteCode: u.inviteCode,
      created: u.created,
    }))

  return response.json(result)
})

inviteManagementApp.get('/members', async (request, response) => {
  const { user } = response.locals

  const members = await postgres.getRepository(User).find({
    where: { organization: Equal(user.organization.uuid) },
    relations: { authProfiles: true },
    order: { created: 'ASC' },
  })

  const result = members
    .filter((u) => u.authProfiles.length > 0)
    .map((u) => ({
      uuid: u.uuid,
      name: u.name,
      created: u.created,
    }))

  return response.json(result)
})

inviteManagementApp.delete('/invite/:uuid', async (request, response) => {
  const { uuid } = request.params
  const { user } = response.locals

  const target = await postgres.getRepository(User).findOne({
    where: {
      uuid,
      organization: Equal(user.organization.uuid),
      inviteCode: Not(''),
    },
    relations: { authProfiles: true },
  })

  if (!target) return response.sendStatus(404)
  if (target.authProfiles.length > 0) return response.sendStatus(409)

  await postgres.getRepository(User).remove(target)
  return response.sendStatus(204)
})
