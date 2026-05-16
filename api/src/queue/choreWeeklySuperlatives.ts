import { Atlas } from '@/atlas/Atlas'
import { ITool } from '@/atlas/IAtlas'
import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { getDataSource } from '@/data-source'
import { ChoreReaction } from '@/entity/ChoreReaction'
import { Organization } from '@/entity/Organization'
import { waitForAtlasPlugins } from '@/plugins'
import { EXCLUDED_REACTIONS } from '@/plugins/chores/excludedReactions'
import { findOutlierChoreCandidates } from '@/plugins/chores/choreOutlier'
import { generateDrilTweet } from '@/plugins/chores/drilTweet'
import Queue from 'bull'
import { randomUUID } from 'crypto'
import { TextChannel } from 'discord.js'
import { DataSource, In } from 'typeorm'
import { redisConfig } from './redis'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

// Common emojis tracked for "guild" leaderboards
type GuildDef = { emoji: string; aliases?: string[] }

const GUILDS: GuildDef[] = [
  { emoji: 'scrubby' },
  { emoji: 'vacuum' },
  { emoji: '♻️', aliases: ['moistGarbo'] },
  { emoji: 'laundry' },
  { emoji: 'chefskiss', aliases: ['vegeta'] },
  { emoji: '🍽️' },
  { emoji: 'grassmowed' },
  { emoji: 'pat' },
  { emoji: 'oil' },
]

// ─── Atlas tool ────────────────────────────────────────────────────────────────

type PickInterestingArgs = { selected: string; reason: string }

const PickInterestingTool: ITool<PickInterestingArgs, PickInterestingArgs> = {
  name: 'PickInteresting',
  description:
    'Pick the most interesting item from the provided list. Set `selected` to the exact verbatim text of the item you chose — do not paraphrase or summarize it.',
  arguments: {
    type: 'object',
    properties: {
      selected: {
        type: 'string',
        description:
          'The exact verbatim text of the item you selected, copied directly from the list',
      },
      reason: {
        type: 'string',
        description: 'A brief reason for your choice (1 sentence max)',
      },
    },
    required: ['selected', 'reason'],
  },
  call: async (_req, _res, args) => args,
}

async function pickInteresting(
  systemPrompt: string,
  candidates: string[],
  tracer: LangfuseTracer,
): Promise<PickInterestingArgs | null> {
  if (candidates.length === 0) return null
  if (candidates.length === 1) return { selected: candidates[0], reason: '' }
  try {
    return await Atlas.processToolRequest(
      PickInterestingTool,
      systemPrompt,
      [candidates.map((c, i) => `${i + 1}. ${c}`).join('\n')],
      undefined,
      tracer,
      0.7,
    )
  } catch (err) {
    console.error('choreWeeklySuperlatives: Atlas pick failed', err)
    return null
  }
}

// ─── Queries ───────────────────────────────────────────────────────────────────

type ReactionTotal = { emoji: string; total: number }
type GuildLeader = {
  discordAuthorId: string
  discordAuthorName: string
  total: number
}

async function getReactionTotals(
  db: DataSource,
  since: Date,
  channelId: string,
): Promise<ReactionTotal[]> {
  return db.query(
    `
    SELECT key AS emoji, SUM(CAST(value AS INT)) AS total
    FROM chore_message
    CROSS JOIN jsonb_each_text(reactions)
    WHERE "postedAt" >= $1
      AND "discordChannelId" = $2
      AND reactions IS NOT NULL
      AND reactions != '{}'::jsonb
      AND CAST(value AS INT) > 0
    GROUP BY key
    ORDER BY total DESC
  `,
    [since, channelId],
  )
}

type AuthorChores = {
  discordAuthorId: string
  discordAuthorName: string
  chores: string[]
}

async function getChoresByAuthor(
  db: DataSource,
  since: Date,
  channelId: string,
): Promise<AuthorChores[]> {
  const rows: Array<{
    discordAuthorId: string
    discordAuthorName: string
    chores: string[]
  }> = await db.query(
    `
    SELECT cm."discordAuthorId", cm."discordAuthorName", array_agg(c.description) AS chores
    FROM chore c
    JOIN chore_message cm ON c."choreMessageId" = cm.id
    WHERE cm."postedAt" >= $1
      AND cm."discordChannelId" = $2
      AND c.difficulty != 'not a chore'
    GROUP BY cm."discordAuthorId", cm."discordAuthorName"
    ORDER BY cm."discordAuthorName"
  `,
    [since, channelId],
  )
  return rows
}

async function getGuildLeaders(
  db: DataSource,
  since: Date,
  channelId: string,
  emojis: string[],
): Promise<GuildLeader[]> {
  const rows: Array<{
    discordAuthorId: string
    discordAuthorName: string
    total: string
  }> = await db.query(
    `
      SELECT "discordAuthorId", "discordAuthorName", SUM(CAST(value AS INT)) AS total
      FROM chore_message
      CROSS JOIN jsonb_each_text(reactions)
      WHERE "postedAt" >= $1
        AND "discordChannelId" = $2
        AND key = ANY($3::text[])
        AND CAST(value AS INT) > 0
      GROUP BY "discordAuthorId", "discordAuthorName"
      ORDER BY total DESC
      LIMIT 2
    `,
    [since, channelId, emojis],
  )
  return rows.map((r) => ({ ...r, total: Number(r.total) }))
}

// ─── Formatting ────────────────────────────────────────────────────────────────

function formatEmoji(name: string, meta: Map<string, ChoreReaction>): string {
  if (!/^[\w]+$/.test(name)) return name
  const r = meta.get(name)
  if (!r?.discordId) return `:${name}:`
  return r.animated ? `<a:${name}:${r.discordId}>` : `<:${name}:${r.discordId}>`
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    timeZone: 'America/New_York',
    month: 'short',
    day: 'numeric',
  })
}

type ChoreShoutout = {
  authorId: string
  authorName: string
  chore: string
  tweet: string
}

function buildMessage(
  since: Date,
  until: Date,
  mostPopular: ReactionTotal,
  mostUnique: PickInterestingArgs | null,
  choreShoutouts: ChoreShoutout[],
  guilds: Array<{ emoji: string; leaders: GuildLeader[] }>,
  reactionMeta: Map<string, ChoreReaction>,
): string {
  const lines: string[] = [
    `✨ **Chore Week in Review** (${formatDate(since)} – ${formatDate(until)})`,
    '',
    `🏅 **Most Popular Reaction**`,
    `${formatEmoji(mostPopular.emoji, reactionMeta)} — ${
      mostPopular.total
    } reaction${mostPopular.total !== 1 ? 's' : ''} this week`,
  ]

  if (mostUnique) {
    lines.push('')
    lines.push(`🌟 **Most Unique Reaction**`)
    const emojiDisplay = formatEmoji(mostUnique.selected, reactionMeta)
    lines.push(
      mostUnique.reason
        ? `${emojiDisplay} — *${mostUnique.reason}*`
        : emojiDisplay,
    )
  }

  if (choreShoutouts.length > 0) {
    lines.push('')
    lines.push(`🔍 **Chore Shoutouts**`)
    for (const { authorId, chore, tweet } of choreShoutouts) {
      lines.push(`<@${authorId}> — *"${chore}"*`)
      lines.push(`> ${tweet}`)
    }
  }

  const activeGuilds = guilds.filter((g) => g.leaders.length > 0)
  if (activeGuilds.length > 0) {
    lines.push('')
    lines.push(`🛡️ **Guilds**`)
    for (const { emoji, leaders } of activeGuilds) {
      const emojiDisplay = formatEmoji(emoji, reactionMeta)
      const leaderStr = leaders
        .map((l) => `<@${l.discordAuthorId}> (${l.total})`)
        .join(' · ')
      lines.push(`${emojiDisplay}  ${leaderStr}`)
    }
  }

  return lines.join('\n')
}

// ─── Core logic ────────────────────────────────────────────────────────────────

async function postSuperlativesForOrg(
  db: DataSource,
  plugins: Awaited<ReturnType<typeof waitForAtlasPlugins>>,
  choresChannelId: string,
  definitionsChannelId: string,
  since: Date,
  until: Date,
  dryRun = false,
): Promise<void> {
  const tracer = new LangfuseTracer(
    'choreWeeklySuperlatives',
    'system',
    randomUUID(),
    { tags: ['superlatives'] },
  )
  const channel = await plugins.discord.client.channels
    .fetch(definitionsChannelId)
    .catch(() => null)
  if (!channel?.isTextBased()) {
    console.warn(
      'choreWeeklySuperlatives: channel not found or not text-based',
      definitionsChannelId,
    )
    return
  }
  console.log('choreWeeklySuperlatives: processing channel', choresChannelId)

  const reactionTotals = (await getReactionTotals(db, since, choresChannelId))
    .filter((r) => !EXCLUDED_REACTIONS.has(r.emoji))
  if (reactionTotals.length === 0) {
    console.log(
      `choreWeeklySuperlatives: no reactions this week for channel ${choresChannelId}, skipping`,
    )
    return
  }

  const mostPopular = reactionTotals[0]

  const allGuildEmojis = GUILDS.flatMap((g) => [g.emoji, ...(g.aliases ?? [])])
  const uniqueReactionCandidates = reactionTotals
    .filter((r) => r.total === 1 && !allGuildEmojis.includes(r.emoji))
    .map((r) => r.emoji)

  const [mostUniqueReaction, authorChoresList, guilds] = await Promise.all([
    pickInteresting(
      'You are helping pick the most interesting or funny custom emoji reaction from a Discord chore-tracking server. Pick the one that seems most unique, surprising, or charming. Be playful.',
      uniqueReactionCandidates,
      tracer,
    ),
    getChoresByAuthor(db, since, choresChannelId),
    Promise.all(
      GUILDS.map(async (g) => ({
        emoji: g.emoji,
        leaders: await getGuildLeaders(db, since, choresChannelId, [
          g.emoji,
          ...(g.aliases ?? []),
        ]),
      })),
    ),
  ])

  const choreShoutouts: ChoreShoutout[] = []
  for (const a of authorChoresList) {
    const candidates = await findOutlierChoreCandidates(a.chores)
    if (candidates.length === 0) continue
    const pick = await pickInteresting(
      'You are picking a standout chore from a list of outliers — chores that are different from everything else someone did this week. Pick the one that is weirdest, funniest, or most unexpected. Avoid generic cleaning tasks.',
      candidates,
      tracer,
    )
    if (!pick) continue
    const previousTweets = choreShoutouts.map((s) => s.tweet)
    const tweet = await generateDrilTweet(pick.selected, tracer, previousTweets)
    choreShoutouts.push({
      authorId: a.discordAuthorId,
      authorName: a.discordAuthorName,
      chore: pick.selected,
      tweet,
    })
  }

  const allEmojis = [
    mostPopular.emoji,
    ...(mostUniqueReaction ? [mostUniqueReaction.selected] : []),
    ...GUILDS.map((g) => g.emoji),
  ]
  const reactionMeta = new Map(
    (await db.getRepository(ChoreReaction).findBy({ name: In(allEmojis) })).map(
      (r) => [r.name, r],
    ),
  )

  const message = buildMessage(
    since,
    until,
    mostPopular,
    mostUniqueReaction,
    choreShoutouts,
    guilds,
    reactionMeta,
  )
  if (dryRun) {
    console.log(
      `\n--- DRY RUN (choresChannel: ${choresChannelId}) ---\n${message}\n`,
    )
    return
  }
  await (channel as TextChannel).send(message)
  console.log(
    `choreWeeklySuperlatives: sent weekly superlatives for channel ${choresChannelId}`,
  )
}

export async function postWeeklySuperlatives(dryRun = false): Promise<void> {
  const db = await getDataSource()
  const plugins = await waitForAtlasPlugins()

  const orgs = await db.getRepository(Organization).find()

  const until = new Date()
  const since = new Date(Date.now() - SEVEN_DAYS_MS)

  for (const org of orgs) {
    const choresChannelId = org.settings?.discord?.choresChannelId
    const definitionsChannelId =
      org.settings?.discord?.choreDefinitionsChannelId
    if (!choresChannelId || !definitionsChannelId) continue
    await postSuperlativesForOrg(
      db,
      plugins,
      choresChannelId,
      definitionsChannelId,
      since,
      until,
      dryRun,
    )
  }
}

// ─── Queue ─────────────────────────────────────────────────────────────────────

export const choreWeeklySuperlativesQueue = new Queue(
  'choreWeeklySuperlatives',
  { redis: redisConfig },
)

choreWeeklySuperlativesQueue.process(() => postWeeklySuperlatives())

// Friday 9pm Eastern ≈ Saturday 2am UTC (9pm EST / 10pm EDT)
export async function ensureChoreWeeklySuperlativesScheduled(): Promise<void> {
  await choreWeeklySuperlativesQueue.add({}, { repeat: { cron: '0 2 * * 6' } })
}
