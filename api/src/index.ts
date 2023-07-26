export * from './interface'
export { AtlasSocketMessage } from './ws'
import { DataSource } from 'typeorm'
import { app } from './app'
import { atlasApi } from './atlas'
import { getDataSource } from './data-source'
import { AtlasWebsocketServer } from './ws'

console.log(process.env.DISCORD_URL)
let db: DataSource
getDataSource().then((_db) => (db = _db))
atlasApi.discord.login()
const rest = app.listen(process.env.port || 3001)
const wss = new AtlasWebsocketServer({
  port: parseInt(process.env.wsPort || '3002'),
})

process.on('beforeExit', () => {
  atlasApi.close()
  rest.close()
  wss.server.close()
  db.destroy()
})
