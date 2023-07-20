export * from './interface'
export { AtlasSocketMessage } from './ws'
import { app } from './app'
import { getClient } from './atlas/discord'
import { AtlasWebsocketServer } from './ws'

console.log(process.env.DISCORD_URL)

getClient().login(process.env.DISCORD_TOKEN || '')
app.listen(process.env.port || 3001)
new AtlasWebsocketServer({ port: parseInt(process.env.wsPort || '3002') })
