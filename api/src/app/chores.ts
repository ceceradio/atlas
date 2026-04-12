import { postgres } from '@/data-source'
import { Chore } from '@/entity/Chore'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { ChoreReaction } from '@/entity/ChoreReaction'
import { choreMessageQueue, ChoreMessageJobData } from '@/queue/choreMessage'
import express from 'express'
import { authorize } from './authorize'
import { withTransaction } from './db'

const EXCLUDED_REACTIONS = new Set(['✨'])

/**
 * Convert a "YYYY-MM-DD" date string to the UTC instant corresponding to
 * midnight at the *end* of that day in America/New_York (i.e., 00:00:00 the
 * next calendar day Eastern time), so a "to" filter is inclusive of all
 * activity logged on that Eastern-time date.
 *
 * Example: "2026-04-12" → 2026-04-13T04:00:00Z (EDT, UTC-4)
 */
function toEasternEndOfDay(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  // Probe noon UTC on the next day — safely away from any DST transition at midnight
  const noonUtcMs = Date.UTC(year, month - 1, day + 1, 12, 0, 0)
  const etStr = new Date(noonUtcMs).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const [h, m, s] = etStr.split(':').map(Number)
  const offsetMs = (12 * 3600 - (h * 3600 + m * 60 + s)) * 1000
  return new Date(Date.UTC(year, month - 1, day + 1) + offsetMs)
}

function filterReactions(reactions: Record<string, number> | null): Record<string, number> {
  if (!reactions) return {}
  return Object.fromEntries(Object.entries(reactions).filter(([emoji]) => !EXCLUDED_REACTIONS.has(emoji)))
}

export const choresApp = express()
choresApp.use(authorize)

choresApp.get('/chores', async (request, response) => {
  const {
    page = '1',
    limit = '20',
    discordAuthorId,
    choreMessageId,
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
  if (choreMessageId) {
    qb.andWhere('choreMessage.id = :choreMessageId', { choreMessageId })
  }
  if (from) {
    qb.andWhere('chore.doneAt >= :from', { from })
  }
  if (to) {
    qb.andWhere('chore.doneAt < :to', { to: toEasternEndOfDay(to) })
  }

  const [chores, total] = await qb.getManyAndCount()

  return response.json({
    data: chores.map((c) => c.toApi()),
    total,
    page: pageNum,
    limit: limitNum,
  })
})

choresApp.get('/chores/profiles', async (request, response) => {
  const { from, to } = request.query as Record<string, string>

  const qb = postgres
    .getRepository(Chore)
    .createQueryBuilder('chore')
    .innerJoin('chore.choreMessage', 'choreMessage')
    .select('choreMessage.discordAuthorId', 'discordAuthorId')
    .addSelect('choreMessage.discordAuthorName', 'discordAuthorName')
    .addSelect('chore.difficulty', 'difficulty')
    .addSelect('COUNT(*)', 'count')
    .groupBy('choreMessage.discordAuthorId')
    .addGroupBy('choreMessage.discordAuthorName')
    .addGroupBy('chore.difficulty')
    .orderBy('choreMessage.discordAuthorName', 'ASC')

  const toUtc = to ? toEasternEndOfDay(to) : undefined

  if (from) qb.andWhere('chore.doneAt >= :from', { from })
  if (toUtc) qb.andWhere('chore.doneAt < :to', { to: toUtc })

  const rows = await qb.getRawMany<{
    discordAuthorId: string
    discordAuthorName: string
    difficulty: string
    count: string
  }>()

  // Aggregate per author
  type AuthorAccum = {
    discordAuthorId: string
    discordAuthorName: string
    small: number
    medium: number
    large: number
    'extra large': number
    total: number
    weightedTotal: number
  }

  const WEIGHTS: Record<string, number> = { small: 1, medium: 2, large: 3, 'extra large': 4 }

  const byAuthor = new Map<string, AuthorAccum>()
  for (const row of rows) {
    if (!byAuthor.has(row.discordAuthorId)) {
      byAuthor.set(row.discordAuthorId, {
        discordAuthorId: row.discordAuthorId,
        discordAuthorName: row.discordAuthorName,
        small: 0,
        medium: 0,
        large: 0,
        'extra large': 0,
        total: 0,
        weightedTotal: 0,
      })
    }
    const accum = byAuthor.get(row.discordAuthorId)!
    const n = parseInt(row.count)
    if (row.difficulty === 'small') accum.small += n
    else if (row.difficulty === 'medium') accum.medium += n
    else if (row.difficulty === 'large') accum.large += n
    else if (row.difficulty === 'extra large') accum['extra large'] += n
    // 'not a chore' rows are excluded from totals
    if (row.difficulty !== 'not a chore') {
      accum.total += n
      accum.weightedTotal += n * (WEIGHTS[row.difficulty] ?? 0)
    }
  }

  // Compute totals across all authors for percentages
  let grandTotal = 0
  let grandWeightedTotal = 0
  for (const a of byAuthor.values()) {
    grandTotal += a.total
    grandWeightedTotal += a.weightedTotal
  }

  // days computed after dailyRows are fetched (see below)

  // Count distinct active days per author (days where they logged at least one chore)
  const activeDaysQb = postgres
    .getRepository(Chore)
    .createQueryBuilder('chore')
    .innerJoin('chore.choreMessage', 'choreMessage')
    .select('choreMessage.discordAuthorId', 'discordAuthorId')
    .addSelect('COUNT(DISTINCT chore.doneAt)', 'activeDays')
    .where("chore.difficulty != 'not a chore'")
    .groupBy('choreMessage.discordAuthorId')

  if (from) activeDaysQb.andWhere('chore.doneAt >= :from', { from })
  if (toUtc) activeDaysQb.andWhere('chore.doneAt < :to', { to: toUtc })

  const activeDaysRows = await activeDaysQb.getRawMany<{ discordAuthorId: string; activeDays: string }>()
  const activeDaysByAuthor = new Map(activeDaysRows.map((r) => [r.discordAuthorId, parseInt(r.activeDays)]))

  // Daily counts per author per difficulty
  const dailyQb = postgres
    .getRepository(Chore)
    .createQueryBuilder('chore')
    .innerJoin('chore.choreMessage', 'choreMessage')
    .select('choreMessage.discordAuthorId', 'discordAuthorId')
    .addSelect('chore.doneAt', 'date')
    .addSelect('chore.difficulty', 'difficulty')
    .addSelect('COUNT(*)', 'count')
    .where("chore.difficulty != 'not a chore'")
    .groupBy('choreMessage.discordAuthorId')
    .addGroupBy('chore.doneAt')
    .addGroupBy('chore.difficulty')
    .orderBy('chore.doneAt', 'ASC')

  if (from) dailyQb.andWhere('chore.doneAt >= :from', { from })
  if (toUtc) dailyQb.andWhere('chore.doneAt < :to', { to: toUtc })

  const dailyRows = await dailyQb.getRawMany<{
    discordAuthorId: string
    date: Date | string
    difficulty: string
    count: string
  }>()

  // Reactions per author: sum across all their chore messages in the date range
  const reactionsQb = postgres
    .getRepository(ChoreMessage)
    .createQueryBuilder('choreMessage')
    .innerJoin('choreMessage.chores', 'chore')
    .select('choreMessage.discordAuthorId', 'discordAuthorId')
    .addSelect('choreMessage.reactions', 'reactions')
    .where('choreMessage.reactions IS NOT NULL')
    .groupBy('choreMessage.id')
    .addGroupBy('choreMessage.discordAuthorId')
    .addGroupBy('choreMessage.reactions')

  if (from) reactionsQb.andWhere('chore.doneAt >= :from', { from })
  if (toUtc) reactionsQb.andWhere('chore.doneAt < :to', { to: toUtc })

  const reactionRows = await reactionsQb.getRawMany<{
    discordAuthorId: string
    reactions: Record<string, number> | null
  }>()

  const reactionsByAuthor = new Map<string, Record<string, number>>()
  for (const row of reactionRows) {
    if (!row.reactions) continue
    if (!reactionsByAuthor.has(row.discordAuthorId)) {
      reactionsByAuthor.set(row.discordAuthorId, {})
    }
    const accum = reactionsByAuthor.get(row.discordAuthorId)!
    for (const [emoji, count] of Object.entries(row.reactions)) {
      accum[emoji] = (accum[emoji] ?? 0) + count
    }
  }

  // Compute days in range — use explicit range if provided, else derive from actual data span
  let days = 1
  if (from && to) {
    const msPerDay = 1000 * 60 * 60 * 24
    days = Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / msPerDay) + 1)
  } else if (dailyRows.length > 0) {
    const dates = dailyRows.map((r) => String(r.date).slice(0, 10)).sort()
    const msPerDay = 1000 * 60 * 60 * 24
    days = Math.max(1, Math.round((new Date(dates[dates.length - 1]).getTime() - new Date(dates[0]).getTime()) / msPerDay) + 1)
  }

  type DailyAccum = Record<string, { date: string; small: number; medium: number; large: number; extraLarge: number }>
  const dailyByAuthor = new Map<string, DailyAccum>()
  for (const row of dailyRows) {
    const dateKey = row.date instanceof Date
      ? row.date.toISOString().slice(0, 10)
      : String(row.date).slice(0, 10)
    if (!dailyByAuthor.has(row.discordAuthorId)) dailyByAuthor.set(row.discordAuthorId, {})
    const byDate = dailyByAuthor.get(row.discordAuthorId)!
    if (!byDate[dateKey]) byDate[dateKey] = { date: dateKey, small: 0, medium: 0, large: 0, extraLarge: 0 }
    const n = parseInt(row.count)
    if (row.difficulty === 'small') byDate[dateKey].small += n
    else if (row.difficulty === 'medium') byDate[dateKey].medium += n
    else if (row.difficulty === 'large') byDate[dateKey].large += n
    else if (row.difficulty === 'extra large') byDate[dateKey].extraLarge += n
  }

  const profiles = Array.from(byAuthor.values()).map((a) => {
    const activeDays = activeDaysByAuthor.get(a.discordAuthorId) ?? 0
    return {
      discordAuthorId: a.discordAuthorId,
      discordAuthorName: a.discordAuthorName,
      small: a.small,
      medium: a.medium,
      large: a.large,
      extraLarge: a['extra large'],
      total: a.total,
      averagePerDay: grandTotal > 0 ? parseFloat((a.total / days).toFixed(2)) : 0,
      weightedAveragePerDay: grandTotal > 0 ? parseFloat((a.weightedTotal / days).toFixed(2)) : 0,
      percentOfTotal: grandTotal > 0 ? parseFloat(((a.total / grandTotal) * 100).toFixed(1)) : 0,
      sizeAdjustedPercentOfTotal: grandWeightedTotal > 0 ? parseFloat(((a.weightedTotal / grandWeightedTotal) * 100).toFixed(1)) : 0,
      zeroDays: Math.max(0, days - activeDays),
      dailyData: Object.values(dailyByAuthor.get(a.discordAuthorId) ?? {}).sort((x, y) => x.date.localeCompare(y.date)),
      reactions: filterReactions(reactionsByAuthor.get(a.discordAuthorId) ?? {}),
    }
  })

  return response.json({ profiles, from: from ?? null, to: to ?? null, days })
})

choresApp.get('/chore-reactions', async (_request, response) => {
  const reactions = await postgres.getRepository(ChoreReaction).find()
  return response.json(reactions)
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
    .loadRelationCountAndMap(
      'choreMessage.notAChoreCount',
      'choreMessage.chores',
      'nac',
      (qb) => qb.where("nac.difficulty = 'not a chore'"),
    )
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
    qb.andWhere('choreMessage.postedAt < :to', { to: toEasternEndOfDay(to) })
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
      choreCount: (m as ChoreMessage & { choreCount: number; notAChoreCount: number }).choreCount,
      notAChoreCount: (m as ChoreMessage & { choreCount: number; notAChoreCount: number }).notAChoreCount,
      reactions: filterReactions(m.reactions),
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

  const orgId = response.locals.user.organization.uuid
  const jobs = await Promise.all(
    messages.map((msg) => choreMessageQueue.add({ ...msg, organizationId: orgId })),
  )
  return response.json({ queued: jobs.length, ids: jobs.map((j) => j.id) })
})

choresApp.post('/chore-message/:id/reprocess', withTransaction(async (request, response) => {
  const { id } = request.params
  const db = response.locals.db

  const choreMessage = await db.findOne(ChoreMessage, { where: { id } })
  if (!choreMessage) return response.sendStatus(404)

  const orgId = response.locals.user.organization.uuid
  const job = await choreMessageQueue.add({
    discordMessageId: choreMessage.discordMessageId,
    discordChannelId: choreMessage.discordChannelId,
    organizationId: orgId,
  })

  return response.status(202).json({ jobId: job.id })
}))

choresApp.get('/chore-jobs', async (_request, response) => {
  const [waiting, active] = await Promise.all([
    choreMessageQueue.getWaiting(),
    choreMessageQueue.getActive(),
  ])

  const toEvent = (status: string) => (job: { id: string | number }) => ({
    jobId: String(job.id),
    queue: 'chores',
    status,
    failedReason: null,
  })

  return response.json([
    ...waiting.map(toEvent('waiting')),
    ...active.map(toEvent('active')),
  ])
})

choresApp.get('/chore-jobs/:jobId', async (request, response) => {
  const { jobId } = request.params
  const job = await choreMessageQueue.getJob(jobId)
  if (!job) return response.sendStatus(404)

  const status = await job.getState()
  return response.json({
    id: job.id,
    status,
    failedReason: job.failedReason ?? null,
    result: job.returnvalue ?? null,
  })
})

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
