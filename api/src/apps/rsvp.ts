import { AppDataSource } from '@/data-source'
import { AuthProfile, AuthProviders } from '@/entity/AuthProfile'
import { User } from '@/entity/User'
import express from 'express'
import { checkJwt } from './auth'
import { AtlasError } from './errors'

export const inviteApp = express()

type RSVPPostBody = {
  inviteCode: string
  provider: AuthProviders
}

inviteApp.post('/rsvp', checkJwt, async (request, response) => {
  const { inviteCode, provider }: RSVPPostBody = await request.body
  const providerId = request.auth?.payload?.sub
  if (!providerId) throw new AtlasError()
  if (!inviteCode) throw new AtlasError()
  const user = await User.getByInvite(AppDataSource, inviteCode)
  if (!user) throw new AtlasError()

  await AuthProfile.create(AppDataSource, user, provider, providerId)

  user.inviteCode = ''
  await AppDataSource.getRepository(User).save(user)

  return response.json({
    user,
  })
})
