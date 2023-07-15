import { AtlasSocketMessage, Joined, routeToOrganization } from '.'
import { UserSocket } from './UserSocket'

const conversationUsers: Record<
  ConversationUuid,
  Record<UserUuid, Timestamp>
> = {}
type ConversationUuid = string
type UserUuid = string
type Timestamp = number

export async function joined(
  socket: UserSocket,
  message: AtlasSocketMessage<Joined>,
) {
  const { type, conversationId } = message
  const userId = socket.user?.uuid
  if (!userId) throw new Error('userId empty for no reason')
  if (!conversationUsers[conversationId]) conversationUsers[conversationId] = {}
  conversationUsers[conversationId][userId] = Date.now()
  conversationUsers[conversationId] = expireUsers(
    conversationUsers[conversationId],
  )
  const userCount = Object.keys(conversationUsers[conversationId]).length
  routeToOrganization(socket.user?.organization.uuid, {
    type,
    conversationId,
    userCount,
  })
}

const TIMEOUT_MS = 100000

function expireUsers(userUpdates: Record<UserUuid, Timestamp>) {
  const entries = Object.entries(userUpdates).filter((entry) => {
    // entry[1] is the "value", date timestamp
    if (entry[1] + TIMEOUT_MS < Date.now()) return false
    else return true
  })
  return Object.fromEntries(entries)
}
