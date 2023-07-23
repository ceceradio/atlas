export * from './interface'
export { AtlasSocketMessage } from './ws'
import { app } from './app'
import { atlasApi } from './atlas'
import { AtlasWebsocketServer } from './ws'

console.log(process.env.DISCORD_URL)

atlasApi.discord.login()
app.listen(process.env.port || 3001)
new AtlasWebsocketServer({ port: parseInt(process.env.wsPort || '3002') })
