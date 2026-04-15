import { checkJwt } from '@/app/authorize'
import { postgres } from '@/data-source'
import { AuditAction } from '@/entity/AuditLog'
import { AuthProfile } from '@/entity/AuthProfile'
import { AuthProviders } from '@/entity/AuthProviders'
import { User } from '@/entity/User'
import express from 'express'
import { auditLog } from './auditLog'

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

  // Load organization for audit log (not included in getByInvite result)
  const userWithOrg = await postgres.getRepository(User).findOne({
    where: { uuid: user.uuid },
    relations: { organization: true },
  })
  if (userWithOrg?.organization) {
    await auditLog(
      user.uuid,
      userWithOrg.organization.uuid,
      AuditAction.RSVP_COMPLETED,
      'User',
      user.uuid,
      undefined,
      { name: user.name, provider },
    )
  }

  return response.json(user)
})
