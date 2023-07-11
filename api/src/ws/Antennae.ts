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
          console.error('encountered turbulence', err)
          userSocket.close()
        }
      }),
    )
  }
}
