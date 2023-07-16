import { AtlasSocketMessage, Update, routeToOrganization } from '.'
import { UserSocket } from './UserSocket'

export async function update(
  socket: UserSocket,
  message: AtlasSocketMessage<Update>,
) {
  if (socket.isIdentified())
    routeToOrganization(socket.organization?.uuid, message)
}
