import { getDataSource } from '@/data-source'
import { AuditAction } from '@/entity/AuditLog'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { Organization } from '@/entity/Organization'
import { OrganizationSettings } from '@/interface/OrganizationSettings'
import { getAtlasPlugins } from '@/plugins'
import express from 'express'
import { In } from 'typeorm'
import { auditLog } from './auditLog'
import { authorize } from './authorize'

export const organizationApp = express()
organizationApp.use(authorize)

organizationApp.get('/organization', async (request, response) => {
  const { user } = response.locals
  if (!user) return response.sendStatus(401)
  const db = await getDataSource()
  const org = await Organization.get(db, user.organization.uuid)
  if (!org) return response.sendStatus(404)
  return response.json(org.toApi())
})

type OrganizationPatchBody = { settings: OrganizationSettings }
organizationApp.patch('/organization', async (request, response) => {
  const { user } = response.locals
  if (!user) return response.sendStatus(401)
  const { settings }: OrganizationPatchBody = request.body
  if (!settings) return response.sendStatus(400)

  const db = await getDataSource()
  const org = await Organization.get(db, user.organization.uuid)
  if (!org) return response.sendStatus(404)

  const prevChoresChannelId = org.settings?.discord?.choresChannelId
  const nextChoresChannelId = settings?.discord?.choresChannelId
  const prevVoteChannelId = org.settings?.discord?.choreDefinitionsChannelId
  const nextVoteChannelId = settings?.discord?.choreDefinitionsChannelId

  const beforeSettings = org.settings
  org.settings = settings
  await db.getRepository(Organization).save(org)

  const orgId = user.organization.uuid
  await auditLog(user.uuid, orgId, AuditAction.ORGANIZATION_SETTINGS_UPDATED, 'Organization', orgId, beforeSettings, settings)

  if (nextChoresChannelId && nextChoresChannelId !== prevChoresChannelId) {
    getAtlasPlugins().initChoreMonitor(db, nextChoresChannelId, orgId)
  } else if (!nextChoresChannelId && prevChoresChannelId) {
    await getAtlasPlugins().choreMonitor?.close()
    getAtlasPlugins().choreMonitor = undefined
  }

  if (nextVoteChannelId && nextVoteChannelId !== prevVoteChannelId) {
    getAtlasPlugins().initChoreDefinitionVoteMonitor(db, nextVoteChannelId)
  } else if (!nextVoteChannelId && prevVoteChannelId) {
    await getAtlasPlugins().choreDefinitionVoteMonitor?.close()
    getAtlasPlugins().choreDefinitionVoteMonitor = undefined
  }

  return response.json(org.toApi())
})

organizationApp.get('/discord/channels', async (request, response) => {
  const { user } = response.locals
  if (!user) return response.sendStatus(401)
  const channels = getAtlasPlugins().discord.getTextChannels()
  return response.json(channels)
})

organizationApp.get('/discord/channel/:channelId/messages', async (request, response) => {
  const { user } = response.locals
  if (!user) return response.sendStatus(401)

  const { channelId } = request.params
  const { before, limit = '50' } = request.query as Record<string, string>

  const client = getAtlasPlugins().discord.client
  const channel = await client.channels.fetch(channelId)
  if (!channel?.isTextBased()) return response.sendStatus(400)

  const messages = await channel.messages.fetch({
    limit: Math.min(100, parseInt(limit)),
    ...(before ? { before } : {}),
  })

  const messageList = [...messages.values()]
  const ids = messageList.map((m) => m.id)

  const db = await getDataSource()
  const imported = await db.getRepository(ChoreMessage).find({
    where: { discordMessageId: In(ids) },
    select: ['discordMessageId'],
  })
  const importedIds = new Set(imported.map((cm) => cm.discordMessageId))

  const result = messageList.map((m) => ({
    id: m.id,
    channelId: m.channelId,
    content: m.content,
    authorId: m.author.id,
    authorName: m.author.username,
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    imported: importedIds.has(m.id),
  }))

  return response.json(result)
})
