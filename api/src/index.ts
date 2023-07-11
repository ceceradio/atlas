export * from './interface'
export { AtlasSocketMessage } from './ws'
import { app } from './app'
import { wsServer } from './ws'

const server = app.listen(process.env.port || 3001)

server.on('upgrade', (request, socket, head) => {
  wsServer.handleUpgrade(request, socket, head, (socket) => {
    socket.on('error', console.error)
    wsServer.emit('connection', socket, request)
  })
})
