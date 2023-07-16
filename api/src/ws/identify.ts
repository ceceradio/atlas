import { AtlasSocketMessage, Identify, organizationAntennae } from '.'
import { Antennae } from './Antennae'
import { UserSocket } from './UserSocket'

export async function identify(
  socket: UserSocket,
  message: AtlasSocketMessage<Identify>,
) {
  const verified = await socket.identify(message.token)
  if (!verified) {
    console.error('not verified')
    return socket.close()
  }
  // add to organization dictionary
  const organizationUuid = socket.user?.organization?.uuid
  if (!organizationUuid) {
    console.error('no organization uuid')
    return socket.close()
  }
  if (!organizationAntennae[organizationUuid])
    organizationAntennae[organizationUuid] = new Antennae()
  organizationAntennae[organizationUuid].clients.add(socket)
}
