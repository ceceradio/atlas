import { messageOrganizationQueue } from '@/queue/messageOrganization'
import { RawData, Server } from 'ws'
import { Antennae } from './Antennae'
import { UserSocket } from './UserSocket'
import { identify } from './identify'
import { joined } from './joined'
import { update } from './update'

export type AtlasSocketMessage<T> = {
  type: 'update' | 'identify' | 'identified' | 'joined'
} & T
export type Identify = {
  token: string
}
export type Update = {
  entity: string
  uuid: string
}
export type Joined = {
  conversationId: string
}

export const organizationAntennae: Record<string, Antennae> = {}

export const wsServer = new Server({ port: 3002 })
wsServer.on('error', console.error)
wsServer.on('connection', (socket) => {
  const userSocket = new UserSocket(socket)
  socket.on(
    'message',
    parseMessage(
      requireIdentification(userSocket, (parsedMessage) => {
        const { type } = parsedMessage
        /* ADD NEW FUNCTIONS HERE */
        if (type === 'joined')
          return joined(userSocket, parsedMessage as AtlasSocketMessage<Joined>)
        if (type === 'update')
          return update(userSocket, parsedMessage as AtlasSocketMessage<Update>)
      }),
    ),
  )
})

function requireIdentification<T>(
  userSocket: UserSocket,
  fn: (parsedMessage: AtlasSocketMessage<object>) => T,
) {
  return (parsedMessage: AtlasSocketMessage<object>): T | void => {
    const { type } = parsedMessage
    if (type === 'identify' && !userSocket.isIdentified())
      identify(userSocket, parsedMessage as AtlasSocketMessage<Identify>)
    else if (!userSocket.isIdentified()) {
      console.error('no identification')
      userSocket.close()
    } else fn(parsedMessage)
  }
}

function parseMessage<T>(fn: (parsedMessage: AtlasSocketMessage<object>) => T) {
  return (message: RawData): T | void => {
    const parsedMessage = JSON.parse(
      message.toString(),
    ) as AtlasSocketMessage<object>
    fn(parsedMessage)
  }
}

messageOrganizationQueue.process(async (job) => {
  const { uuid, message } = job.data
  await routeToOrganization(uuid, message)
  return true
})

export async function routeToOrganization<T>(
  uuid: string | undefined,
  message: AtlasSocketMessage<T>,
) {
  if (!uuid) return console.error('big problem. uuid doesnt work.')
  if (!organizationAntennae[uuid])
    return console.error('small problem. no clients available')
  organizationAntennae[uuid].broadcast(message)
}
