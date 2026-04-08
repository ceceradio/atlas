import { postgres } from '@/data-source'
import { Chore } from '@/entity/Chore'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { choreMessageQueue, ChoreMessageJobData } from '@/queue/choreMessage'
import express from 'express'
import { authorize } from './authorize'
import { withTransaction } from './db'

export const choresApp = express()
choresApp.use(authorize)

choresApp.get('/chores', async (request, response) => {
  const {
    page = '1',
    limit = '20',
    discordAuthorId,
    from,
    to,
  } = request.query as Record<string, string>

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  const qb = postgres
    .getRepository(Chore)
    .createQueryBuilder('chore')
    .innerJoinAndSelect('chore.choreMessage', 'choreMessage')
    .orderBy('chore.doneAt', 'DESC')
    .addOrderBy('choreMessage.postedAt', 'DESC')
    .skip(offset)
    .take(limitNum)

  if (discordAuthorId) {
    qb.andWhere('choreMessage.discordAuthorId = :discordAuthorId', {
      discordAuthorId,
    })
  }
  if (from) {
    qb.andWhere('chore.doneAt >= :from', { from })
  }
  if (to) {
    qb.andWhere('chore.doneAt <= :to', { to })
  }

  const [chores, total] = await qb.getManyAndCount()

  return response.json({
    data: chores.map((c) => c.toApi()),
    total,
    page: pageNum,
    limit: limitNum,
  })
})

choresApp.get('/chores/authors', async (request, response) => {
  const authors = await postgres
    .getRepository(ChoreMessage)
    .createQueryBuilder('choreMessage')
    .select('choreMessage.discordAuthorId', 'discordAuthorId')
    .addSelect('choreMessage.discordAuthorName', 'discordAuthorName')
    .distinct(true)
    .orderBy('choreMessage.discordAuthorName', 'ASC')
    .getRawMany()

  return response.json(authors)
})

choresApp.get('/chore-messages', async (request, response) => {
  const {
    page = '1',
    limit = '20',
    discordAuthorId,
    from,
    to,
    noChores,
  } = request.query as Record<string, string>

  const pageNum = Math.max(1, parseInt(page))
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)))
  const offset = (pageNum - 1) * limitNum

  const qb = postgres
    .getRepository(ChoreMessage)
    .createQueryBuilder('choreMessage')
    .loadRelationCountAndMap('choreMessage.choreCount', 'choreMessage.chores')
    .orderBy('choreMessage.postedAt', 'DESC')
    .skip(offset)
    .take(limitNum)

  if (discordAuthorId) {
    qb.andWhere('choreMessage.discordAuthorId = :discordAuthorId', { discordAuthorId })
  }
  if (from) {
    qb.andWhere('choreMessage.postedAt >= :from', { from })
  }
  if (to) {
    qb.andWhere('choreMessage.postedAt <= :to', { to })
  }
  if (noChores === 'true') {
    qb.andWhere(
      (qb) =>
        'NOT EXISTS ' +
        qb
          .subQuery()
          .select('1')
          .from(Chore, 'c')
          .where('c.choreMessageId = choreMessage.id')
          .getQuery(),
    )
  }

  const [messages, total] = await qb.getManyAndCount()

  return response.json({
    data: messages.map((m) => ({
      id: m.id,
      discordMessageId: m.discordMessageId,
      discordAuthorId: m.discordAuthorId,
      discordAuthorName: m.discordAuthorName,
      content: m.content,
      postedAt: m.postedAt,
      editedAt: m.editedAt,
      createdAt: m.createdAt,
      choreCount: (m as ChoreMessage & { choreCount: number }).choreCount,
    })),
    total,
    page: pageNum,
    limit: limitNum,
  })
})

choresApp.post('/chore-messages/bulk', async (request, response) => {
  const messages: ChoreMessageJobData[] = request.body
  if (!Array.isArray(messages) || messages.length === 0) {
    return response.status(400).json({ error: 'Expected a non-empty array of messages' })
  }

  const jobs = await Promise.all(messages.map((msg) => choreMessageQueue.add(msg)))
  return response.json({ queued: jobs.length, ids: jobs.map((j) => j.id) })
})

choresApp.post('/chore-message/:id/reprocess', withTransaction(async (request, response) => {
  const { id } = request.params
  const db = response.locals.db

  const choreMessage = await db.findOne(ChoreMessage, { where: { id } })
  if (!choreMessage) return response.sendStatus(404)

  const job = await choreMessageQueue.add({
    discordMessageId: choreMessage.discordMessageId,
    discordChannelId: choreMessage.discordChannelId,
  })

  return response.status(202).json({ jobId: job.id })
}))

type ChorePatchBody = {
  description?: string
  doneAt?: string
  difficulty?: string
}

choresApp.patch('/chore/:id', async (request, response) => {
  const { id } = request.params
  const { description, doneAt, difficulty }: ChorePatchBody = request.body

  const choreRepo = postgres.getRepository(Chore)
  const chore = await choreRepo.findOne({
    where: { id },
    relations: ['choreMessage'],
  })
  if (!chore) return response.sendStatus(404)

  if (description !== undefined) chore.description = description
  if (doneAt !== undefined) chore.doneAt = new Date(doneAt)
  if (difficulty !== undefined) chore.difficulty = difficulty

  await choreRepo.save(chore)
  return response.json(chore.toApi())
})
