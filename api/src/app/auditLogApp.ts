import { postgres } from '@/data-source'
import { AuditLog } from '@/entity/AuditLog'
import { User } from '@/entity/User'
import express from 'express'
import { In } from 'typeorm'
import { authorize } from './authorize'

export const auditLogApp = express()
auditLogApp.use(authorize)

auditLogApp.get('/audit-log', async (request, response) => {
  const { page = '1', limit = '20', action, entityType } = request.query as Record<string, string>
  const { user } = response.locals

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  const qb = postgres
    .getRepository(AuditLog)
    .createQueryBuilder('log')
    .where('log.organizationId = :orgId', { orgId: user.organization.uuid })
    .orderBy('log.createdAt', 'DESC')
    .skip(offset)
    .take(limitNum)

  if (action) qb.andWhere('log.action = :action', { action })
  if (entityType) qb.andWhere('log.entityType = :entityType', { entityType })

  const [entries, total] = await qb.getManyAndCount()

  // Enrich with user names
  const userIds = [...new Set(entries.map((e) => e.userId).filter((id): id is string => id !== null))]
  const users = userIds.length > 0
    ? await postgres.getRepository(User).findBy({ uuid: In(userIds) })
    : []
  const userMap = new Map(users.map((u) => [u.uuid, u.name]))

  return response.json({
    data: entries.map((e) => ({
      ...e.toApi(),
      userName: e.userId ? (userMap.get(e.userId) ?? null) : null,
    })),
    total,
    page: pageNum,
    limit: limitNum,
  })
})
