export * from './interface'
export { AtlasSocketMessage } from './ws'
import { app } from './app'
import { AtlasWebsocketServer } from './ws'

app.listen(process.env.port || 3001)
new AtlasWebsocketServer({ port: parseInt(process.env.wsPort || '3002') })
