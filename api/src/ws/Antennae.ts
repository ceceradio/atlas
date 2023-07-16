import { CLOSED } from 'ws'
import type { AtlasSocketMessage } from '.'
import { UserSocket } from './UserSocket'

export class Antennae {
  public clients: Set<UserSocket> = new Set()

  async broadcast(message: AtlasSocketMessage<unknown>): Promise<void> {
    // naive
    this.clients.forEach((userSocket) =>
      userSocket.socket.send(JSON.stringify(message), (err) => {
        if (err) {
          this.clients.delete(userSocket)
          if (userSocket.socket.readyState === CLOSED) return
          console.debug('encountered turbulence', err)
          userSocket.close()
        }
      }),
    )
  }
}
