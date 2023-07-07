import { checkJwt } from '@/app/authorize'
import { postgres } from '@/data-source'
import { AuthProfile, AuthProviders } from '@/entity/AuthProfile'
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
  if (!providerId) return response.status(400)
  if (!inviteCode) return response.status(400)
  const user = await User.getByInvite(postgres, inviteCode)
  if (!user) return response.status(400)

  await AuthProfile.create(postgres, user, provider, providerId)

  user.inviteCode = ''
  await postgres.getRepository(User).save(user)

  return response.json(user)
})
