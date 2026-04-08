import { checkJwt } from '@/app/authorize'
import { postgres } from '@/data-source'
import { AuthProfile } from '@/entity/AuthProfile'
import { AuthProviders } from '@/entity/AuthProviders'
import { User } from '@/entity/User'
import express from 'express'

export const inviteApp = express()

type RSVPPostBody = {
  inviteCode: string
  provider: AuthProviders
}

inviteApp.post('/rsvp', checkJwt, async (request, response) => {
  const { inviteCode, provider }: RSVPPostBody = await request.body
  const providerId = request.auth?.payload?.sub
  if (!providerId) return response.sendStatus(400)
  if (!inviteCode) return response.sendStatus(400)
  const user = await User.getByInvite(postgres, inviteCode)
  if (!user) return response.sendStatus(400)
  if (provider !== 'auth0') return response.sendStatus(400)
  await AuthProfile.create(postgres, user, provider, providerId)

  user.inviteCode = ''
  await postgres.getRepository(User).save(user)

  return response.json(user)
})
