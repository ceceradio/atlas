import { AppDataSource } from '@/data-source'
import { AuthProfile, AuthProviders } from '@/entity/AuthProfile'
import { User } from '@/entity/User'
import express from 'express'
import { checkJwt } from './auth'

export const inviteApp = express()

type RSVPPostBody = {
  inviteCode: string
  provider: AuthProviders
}
inviteApp.post('/rsvp', checkJwt, async (request, response) => {
  const { inviteCode, provider }: RSVPPostBody = await request.body
  console.log(inviteCode, provider)
  // @todo remove hack lol
  const providerId = '' + request.auth?.payload?.aud
  if (!providerId) throw new Error()
  if (!inviteCode) throw new Error()
  const user = await User.getByInvite(AppDataSource, inviteCode)
  if (!user) throw new Error()

  await AuthProfile.create(AppDataSource, user, provider, providerId)

  user.inviteCode = ''
  await AppDataSource.getRepository(User).save(user)

  return response.json({
    user,
  })
})
