import { embedQwen } from '@/atlas/ai-compat/openai/embed-qwen'
import { postgres } from '@/data-source'
import { AuditAction } from '@/entity/AuditLog'
import { Chore } from '@/entity/Chore'
import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { ChoreDefinitionVote } from '@/entity/ChoreDefinitionVote'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { ChoreReaction } from '@/entity/ChoreReaction'
import { dateSubtract } from '@/lib/dateAdd'
import { getAtlasPlugins } from '@/plugins'
import { findLastDoneAtByDefinitions } from '@/plugins/chores/choreChunkEmbeddings'
import { setChoreDefinitionEmbedding } from '@/plugins/chores/choreDefinitionEmbeddings'
import { ChoreDifficulty } from '@/plugins/chores/ChoreTypes'
import { choreDefinitionDiscoveryQueue } from '@/queue/choreDefinitionDiscovery'
import { choreDefinitionVoteTallyQueue } from '@/queue/choreDefinitionVoteTally'
import { ChoreMessageJobData, choreMessageQueue } from '@/queue/choreMessage'
import express from 'express'
import { auditLog } from './auditLog'
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

function filterReactions(
  reactions: Record<string, number> | null,
): Record<string, number> {
  if (!reactions) return {}
  return Object.fromEntries(
    Object.entries(reactions).filter(
      ([emoji]) => !EXCLUDED_REACTIONS.has(emoji),
    ),
  )
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
    search,
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
  if (search) {
    const terms = search.trim().split(/\s+/)
    terms.forEach((term, i) => {
      if (term.startsWith('-') && term.length > 1) {
        qb.andWhere(`chore.description NOT ILIKE :excl${i}`, {
          [`excl${i}`]: `%${term.slice(1)}%`,
        })
      } else {
        qb.andWhere(`chore.description ILIKE :incl${i}`, {
          [`incl${i}`]: `%${term}%`,
        })
      }
    })
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

  const WEIGHTS: Record<string, number> = {
    small: 1,
    medium: 2,
    large: 3,
    'extra large': 4,
  }

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

  const activeDaysRows = await activeDaysQb.getRawMany<{
    discordAuthorId: string
    activeDays: string
  }>()
  const activeDaysByAuthor = new Map(
    activeDaysRows.map((r) => [r.discordAuthorId, parseInt(r.activeDays)]),
  )

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
    days = Math.max(
      1,
      Math.round(
        (new Date(to).getTime() - new Date(from).getTime()) / msPerDay,
      ) + 1,
    )
  } else if (dailyRows.length > 0) {
    const dates = dailyRows.map((r) => String(r.date).slice(0, 10)).sort()
    const msPerDay = 1000 * 60 * 60 * 24
    days = Math.max(
      1,
      Math.round(
        (new Date(dates[dates.length - 1]).getTime() -
          new Date(dates[0]).getTime()) /
          msPerDay,
      ) + 1,
    )
  }

  type DailyAccum = Record<
    string,
    {
      date: string
      small: number
      medium: number
      large: number
      extraLarge: number
    }
  >
  const dailyByAuthor = new Map<string, DailyAccum>()
  for (const row of dailyRows) {
    const dateKey =
      row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date).slice(0, 10)
    if (!dailyByAuthor.has(row.discordAuthorId))
      dailyByAuthor.set(row.discordAuthorId, {})
    const byDate = dailyByAuthor.get(row.discordAuthorId)!
    if (!byDate[dateKey])
      byDate[dateKey] = {
        date: dateKey,
        small: 0,
        medium: 0,
        large: 0,
        extraLarge: 0,
      }
    const n = parseInt(row.count)
    if (row.difficulty === 'small') byDate[dateKey].small += n
    else if (row.difficulty === 'medium') byDate[dateKey].medium += n
    else if (row.difficulty === 'large') byDate[dateKey].large += n
    else if (row.difficulty === 'extra large') byDate[dateKey].extraLarge += n
  }

  const voteQb = postgres
    .getRepository(ChoreDefinitionVote)
    .createQueryBuilder('vote')
    .select('vote.discordName', 'discordName')
    .addSelect('COUNT(*)', 'voteCount')
    .groupBy('vote.discordName')

  if (from) voteQb.andWhere('vote.tallyDate >= :from', { from })
  if (to) voteQb.andWhere('vote.tallyDate <= :to', { to })

  const voteRows = await voteQb.getRawMany<{
    discordName: string
    voteCount: string
  }>()
  const voteCountByName = new Map(
    voteRows.map((r) => [r.discordName, parseInt(r.voteCount)]),
  )

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
      averagePerDay:
        grandTotal > 0 ? parseFloat((a.total / days).toFixed(2)) : 0,
      weightedAveragePerDay:
        grandTotal > 0 ? parseFloat((a.weightedTotal / days).toFixed(2)) : 0,
      percentOfTotal:
        grandTotal > 0
          ? parseFloat(((a.total / grandTotal) * 100).toFixed(1))
          : 0,
      sizeAdjustedPercentOfTotal:
        grandWeightedTotal > 0
          ? parseFloat(
              ((a.weightedTotal / grandWeightedTotal) * 100).toFixed(1),
            )
          : 0,
      zeroDays: Math.max(0, days - activeDays),
      dailyData: Object.values(dailyByAuthor.get(a.discordAuthorId) ?? {}).sort(
        (x, y) => x.date.localeCompare(y.date),
      ),
      reactions: filterReactions(
        reactionsByAuthor.get(a.discordAuthorId) ?? {},
      ),
      voteCount: voteCountByName.get(a.discordAuthorName) ?? 0,
    }
  })

  return response.json({ profiles, from: from ?? null, to: to ?? null, days })
})

const WINDOW_DAYS = 14
const MS_PER_DAY = 1000 * 60 * 60 * 24

choresApp.get(
  '/chores/profiles/:discordAuthorId/history',
  async (request, response) => {
    const { discordAuthorId } = request.params
    const { from, to } = request.query as Record<string, string>
    if (!from) return response.status(400).json({ error: 'from is required' })

    const toDate = to ? to : new Date().toISOString().slice(0, 10)

    // Fetch from (from - 29 days) so the first window is fully populated
    const windowStart = dateSubtract(new Date(from), WINDOW_DAYS - 1, 'day')
    const windowStartStr = windowStart.toISOString().slice(0, 10)

    const rows = await postgres
      .getRepository(Chore)
      .createQueryBuilder('chore')
      .innerJoin('chore.choreMessage', 'choreMessage')
      .select('chore.doneAt', 'date')
      .addSelect('chore.difficulty', 'difficulty')
      .addSelect('COUNT(*)', 'count')
      .where('choreMessage.discordAuthorId = :discordAuthorId', {
        discordAuthorId,
      })
      .andWhere("chore.difficulty != 'not a chore'")
      .andWhere('chore.doneAt >= :windowStart', { windowStart: windowStartStr })
      .andWhere('chore.doneAt < :to', { to: toEasternEndOfDay(toDate) })
      .groupBy('chore.doneAt')
      .addGroupBy('chore.difficulty')
      .orderBy('chore.doneAt', 'ASC')
      .getRawMany<{ date: Date | string; difficulty: string; count: string }>()

    // Build a map of date string -> difficulty counts
    type DayCounts = {
      small: number
      medium: number
      large: number
      extraLarge: number
    }
    const dailyMap = new Map<string, DayCounts>()
    for (const row of rows) {
      const dateKey =
        row.date instanceof Date
          ? row.date.toISOString().slice(0, 10)
          : String(row.date).slice(0, 10)
      if (!dailyMap.has(dateKey))
        dailyMap.set(dateKey, { small: 0, medium: 0, large: 0, extraLarge: 0 })
      const d = dailyMap.get(dateKey)!
      const n = parseInt(row.count)
      if (row.difficulty === 'small') d.small += n
      else if (row.difficulty === 'medium') d.medium += n
      else if (row.difficulty === 'large') d.large += n
      else if (row.difficulty === 'extra large') d.extraLarge += n
    }

    // Walk each day in [from, to] and compute the 14-day rolling window
    const history: {
      date: string
      small: number
      medium: number
      large: number
      extraLarge: number
      total: number
      weightedTotal: number
      averagePerDay: number
      weightedAveragePerDay: number
      activeDays: number
      zeroDays: number
    }[] = []

    const fromMs = new Date(from).getTime()
    const toMs = new Date(toDate).getTime()

    for (let ms = fromMs; ms <= toMs; ms += MS_PER_DAY) {
      const dayStr = new Date(ms).toISOString().slice(0, 10)
      let small = 0,
        medium = 0,
        large = 0,
        extraLarge = 0,
        activeDays = 0

      for (let w = 0; w < WINDOW_DAYS; w++) {
        const wStr = new Date(ms - w * MS_PER_DAY).toISOString().slice(0, 10)
        const d = dailyMap.get(wStr)
        if (!d) continue
        small += d.small
        medium += d.medium
        large += d.large
        extraLarge += d.extraLarge
        activeDays++
      }

      const total = small + medium + large + extraLarge
      const weightedTotal = small * 1 + medium * 2 + large * 3 + extraLarge * 4

      history.push({
        date: dayStr,
        small,
        medium,
        large,
        extraLarge,
        total,
        weightedTotal,
        averagePerDay: parseFloat((total / WINDOW_DAYS).toFixed(2)),
        weightedAveragePerDay: parseFloat(
          (weightedTotal / WINDOW_DAYS).toFixed(2),
        ),
        activeDays,
        zeroDays: WINDOW_DAYS - activeDays,
      })
    }

    return response.json({ discordAuthorId, from, to: toDate, history })
  },
)

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
    search,
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
    qb.andWhere('choreMessage.discordAuthorId = :discordAuthorId', {
      discordAuthorId,
    })
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
  if (search) {
    qb.andWhere('choreMessage.content ILIKE :search', { search: `%${search}%` })
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
      choreCount: (
        m as ChoreMessage & { choreCount: number; notAChoreCount: number }
      ).choreCount,
      notAChoreCount: (
        m as ChoreMessage & { choreCount: number; notAChoreCount: number }
      ).notAChoreCount,
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
    return response
      .status(400)
      .json({ error: 'Expected a non-empty array of messages' })
  }

  const { user } = response.locals
  const orgId = user.organization.uuid
  const jobs = await Promise.all(
    messages.map((msg) =>
      choreMessageQueue.add({ ...msg, organizationId: orgId }),
    ),
  )

  await auditLog(
    user.uuid,
    orgId,
    AuditAction.CHORE_MESSAGES_BULK_QUEUED,
    'ChoreMessage',
    null,
    undefined,
    undefined,
    { count: messages.length },
  )

  return response.json({ queued: jobs.length, ids: jobs.map((j) => j.id) })
})

choresApp.post(
  '/chore-message/:id/reprocess',
  withTransaction(async (request, response) => {
    const { id } = request.params
    const db = response.locals.db

    const choreMessage = await db.findOne(ChoreMessage, { where: { id } })
    if (!choreMessage) return response.sendStatus(404)

    const { user } = response.locals
    const orgId = user.organization.uuid
    const job = await choreMessageQueue.add({
      discordMessageId: choreMessage.discordMessageId,
      discordChannelId: choreMessage.discordChannelId,
      organizationId: orgId,
    })

    await auditLog(
      user.uuid,
      orgId,
      AuditAction.CHORE_MESSAGE_REPROCESSED,
      'ChoreMessage',
      id,
    )

    return response.status(202).json({ jobId: job.id })
  }),
)

choresApp.get('/chore-jobs', async (_request, response) => {
  const queues = [
    [choreMessageQueue, 'chores'],
    [choreDefinitionDiscoveryQueue, 'choreDefinitionDiscovery'],
    [choreDefinitionVoteTallyQueue, 'choreDefinitionVoteTally'],
  ] as const

  const results = await Promise.all(
    queues.flatMap(([queue, name]) => [
      queue
        .getWaiting()
        .then((jobs) =>
          jobs.map((job) => ({
            jobId: String(job.id),
            queue: name,
            status: 'waiting' as const,
            failedReason: null,
          })),
        ),
      queue
        .getActive()
        .then((jobs) =>
          jobs.map((job) => ({
            jobId: String(job.id),
            queue: name,
            status: 'active' as const,
            failedReason: null,
          })),
        ),
    ]),
  )

  return response.json(results.flat())
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

  const before = {
    description: chore.description,
    doneAt: chore.doneAt,
    difficulty: chore.difficulty,
  }

  if (description !== undefined) chore.description = description
  if (doneAt !== undefined) chore.doneAt = new Date(doneAt)
  if (difficulty !== undefined) chore.difficulty = difficulty

  await choreRepo.save(chore)

  const { user } = response.locals
  await auditLog(
    user.uuid,
    user.organization.uuid,
    AuditAction.CHORE_UPDATED,
    'Chore',
    id,
    before,
    {
      description: chore.description,
      doneAt: chore.doneAt,
      difficulty: chore.difficulty,
    },
  )

  return response.json(chore.toApi())
})

// ── Chore Definitions ──────────────────────────────────────────────────────

choresApp.get('/chore-definitions', async (request, response) => {
  const { sized } = request.query as Record<string, string>
  const repo = postgres.getRepository(ChoreDefinition)
  const qb = repo.createQueryBuilder('def').orderBy('def.name', 'ASC')
  if (sized === 'true') qb.andWhere('def.size IS NOT NULL')
  if (sized === 'false') qb.andWhere('def.size IS NULL')
  const definitions = await qb.getMany()
  const lastDoneAtMap = await findLastDoneAtByDefinitions(definitions.map((d) => d.id))
  return response.json(definitions.map((d) => d.toApi(lastDoneAtMap.get(d.id))))
})

choresApp.post('/chore-definitions', async (request, response) => {
  const {
    name,
    size,
    aliasOfId,
  }: { name?: string; size?: ChoreDifficulty; aliasOfId?: string | null } =
    request.body
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return response.status(400).json({ error: 'name is required' })
  }
  const repo = postgres.getRepository(ChoreDefinition)
  if (aliasOfId != null) {
    const target = await repo.findOne({ where: { id: aliasOfId } })
    if (!target)
      return response.status(400).json({ error: 'Target definition not found' })
    if (target.aliasOfId != null)
      return response
        .status(400)
        .json({
          error:
            'Cannot alias an alias — only top-level definitions can be aliased',
        })
  }
  const def = repo.create({
    name: name.trim(),
    size: size ?? null,
    aliasOfId: aliasOfId ?? null,
  })
  try {
    await repo.save(def)
  } catch (err: unknown) {
    const pg = err as { code?: string }
    if (pg.code === '23505')
      return response
        .status(409)
        .json({ error: 'A definition with that name already exists' })
    throw err
  }

  const { user } = response.locals
  await auditLog(
    user.uuid,
    user.organization.uuid,
    AuditAction.CHORE_DEFINITION_CREATED,
    'ChoreDefinition',
    def.id,
    undefined,
    { name: def.name, size: def.size, aliasOfId: def.aliasOfId },
  )

  embedQwen(def.name)
    .then((embedding) => setChoreDefinitionEmbedding(def.id, embedding))
    .catch((err) =>
      console.error(`Failed to embed chore definition "${def.name}":`, err),
    )

  return response.status(201).json(def.toApi())
})

choresApp.patch('/chore-definitions/:id', async (request, response) => {
  const { id } = request.params
  const {
    name,
    size,
    aliasOfId,
  }: {
    name?: string
    size?: ChoreDifficulty | null
    aliasOfId?: string | null
  } = request.body
  const repo = postgres.getRepository(ChoreDefinition)
  const def = await repo.findOne({ where: { id } })
  if (!def) return response.sendStatus(404)

  const before = { name: def.name, size: def.size, aliasOfId: def.aliasOfId }

  if (name !== undefined) def.name = name.trim()
  if ('size' in request.body) def.size = size ?? null
  let aliasTargetName: string | null = null
  if ('aliasOfId' in request.body) {
    if (aliasOfId != null) {
      if (aliasOfId === id)
        return response
          .status(400)
          .json({ error: 'A definition cannot alias itself' })
      const target = await repo.findOne({ where: { id: aliasOfId } })
      if (!target)
        return response
          .status(400)
          .json({ error: 'Target definition not found' })
      if (target.aliasOfId != null)
        return response
          .status(400)
          .json({
            error:
              'Cannot alias an alias — only top-level definitions can be aliased',
          })
      aliasTargetName = target.name
    }
    def.aliasOfId = aliasOfId ?? null
  }
  try {
    await repo.save(def)
  } catch (err: unknown) {
    const pg = err as { code?: string }
    if (pg.code === '23505')
      return response
        .status(409)
        .json({ error: 'A definition with that name already exists' })
    throw err
  }

  const { user } = response.locals
  await auditLog(
    user.uuid,
    user.organization.uuid,
    AuditAction.CHORE_DEFINITION_UPDATED,
    'ChoreDefinition',
    id,
    before,
    { name: def.name, size: def.size, aliasOfId: def.aliasOfId },
  )

  if (def.name !== before.name) {
    embedQwen(def.name)
      .then((embedding) => setChoreDefinitionEmbedding(def.id, embedding))
      .catch((err) =>
        console.error(
          `Failed to re-embed chore definition "${def.name}":`,
          err,
        ),
      )

    const voteMonitor = getAtlasPlugins()?.choreDefinitionVoteMonitor
    if (voteMonitor) {
      voteMonitor
        .updateVoteMessage(def, before.name)
        .catch((err) =>
          console.error('Failed to update Discord vote message:', err),
        )
    }
  }

  if (before.aliasOfId === null && def.aliasOfId !== null && aliasTargetName) {
    const voteMonitor = getAtlasPlugins()?.choreDefinitionVoteMonitor
    if (voteMonitor) {
      voteMonitor
        .aliasVoteMessage(def, aliasTargetName)
        .catch((err) =>
          console.error(
            'Failed to update Discord vote message after aliasing:',
            err,
          ),
        )
    }
  }

  return response.json(def.toApi())
})

choresApp.delete('/chore-definitions/:id', async (request, response) => {
  const { id } = request.params
  const repo = postgres.getRepository(ChoreDefinition)
  const def = await repo.findOne({ where: { id } })
  if (!def) return response.sendStatus(404)

  const before = { name: def.name, size: def.size, aliasOfId: def.aliasOfId }

  const voteMonitor = getAtlasPlugins()?.choreDefinitionVoteMonitor
  if (voteMonitor) {
    voteMonitor
      .cancelVoteMessage(def)
      .catch((err) =>
        console.error('Failed to cancel Discord vote message:', err),
      )
  }

  await repo.remove(def)

  const { user } = response.locals
  await auditLog(
    user.uuid,
    user.organization.uuid,
    AuditAction.CHORE_DEFINITION_DELETED,
    'ChoreDefinition',
    id,
    before,
  )

  return response.sendStatus(204)
})

choresApp.post(
  '/chore-definitions/:id/send-vote',
  async (request, response) => {
    const { id } = request.params
    const repo = postgres.getRepository(ChoreDefinition)
    const def = await repo.findOne({ where: { id } })
    if (!def) return response.sendStatus(404)

    if (def.size !== null)
      return response.status(400).json({ error: 'Definition is already rated' })
    if (def.aliasOfId !== null)
      return response.status(400).json({ error: 'Aliases cannot be voted on' })
    if (def.discordVoteMessageId !== null)
      return response
        .status(409)
        .json({ error: 'A vote is already active for this definition' })

    const voteMonitor = getAtlasPlugins()?.choreDefinitionVoteMonitor
    if (!voteMonitor)
      return response
        .status(503)
        .json({ error: 'Discord vote monitor is not available' })

    await voteMonitor.sendVoteMessages([def])

    const updated = await repo.findOne({ where: { id } })
    return response.json((updated ?? def).toApi())
  },
)
