import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { seedChoreDefinitions } from '@/cli'
import listOrganizations from '@/cli/list-organizations'
import listUsers from '@/cli/list-users'
import registerOrganization from '@/cli/register-organization'
import registerUser from '@/cli/register-user'
import respond from '@/cli/respond'
import responseEvaluation from '@/cli/response-evaluation'
import retitleConversation from '@/cli/retitle-conversation'
import { getDataSource } from '@/data-source'
import { Organization } from '@/entity/Organization'
import { processChoreMessage } from '@/plugins/chores/processChoreMessage'
import { AtlasDiscord } from '@/plugins/discord'
import crypto from 'crypto'
import { TextChannel } from 'discord.js'
import { start } from 'repl'

async function initializeRepl() {
  const db = await getDataSource()

  const discord = new AtlasDiscord()
  await new Promise<void>((resolve) => discord.client.once('ready', resolve))

  async function testLatestChoreMessage(messagesBack = 0) {
    const orgs = await Organization.list(db)
    const channelId = orgs[0]?.settings?.discord?.choresChannelId
    if (!channelId) return console.error('No chores channel configured on org')

    const channel = await discord.client.channels.fetch(channelId)
    if (!channel || !(channel instanceof TextChannel)) {
      return console.error('Channel not found or not a text channel')
    }

    const messages = await channel.messages.fetch({ limit: 1 + messagesBack })
    const latest = messages.at(-1)
    if (!latest) return console.error('No messages in channel')

    console.log(
      `Processing: "${latest.content}" (from ${latest.author.username})`,
    )
    return processChoreMessage(
      latest.content,
      latest.createdAt.toLocaleString(),
      '',
    )
  }

  const state = {
    tracer: new LangfuseTracer('atlas-repl', 'repl', crypto.randomUUID()),
    seedChoreDefinitions: () => seedChoreDefinitions(db),
    processChoreMessage,
    testLatestChoreMessage,
    db,
    listUsers: () => listUsers(db),
    listOrganizations: () => listOrganizations(db),
    registerOrganization: (name: string) => registerOrganization(db, name),
    registerUser: (uuid: string, name: string) => registerUser(db, uuid, name),
    retitleConversation: (uuid: string) => retitleConversation(db, uuid),
    respond: (uuid: string) => respond(db, uuid),
    responseEvaluation: (uuid: string) => responseEvaluation(db, uuid),
  }
  const repl = start('atlas > ')
  Object.assign(repl.context, state)
  repl.setupHistory(`./.repl-history`, (err) => {
    if (err) console.error(err)
  })
}

initializeRepl().then(() => Function.prototype, console.error)
