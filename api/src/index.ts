export * from './interface'
export { AtlasSocketMessage } from './ws'
import { DataSource } from 'typeorm'
import { app } from './app'
import { getDataSource } from './data-source'
import { AtlasPlugins } from './plugins'
import { AtlasWebsocketServer } from './ws'

let db: DataSource
getDataSource().then((_db) => (db = _db))

const rest = app.listen(process.env.port || 3001)

const wss = new AtlasWebsocketServer({
  port: parseInt(process.env.wsPort || '3002'),
})

const atlasPlugins = new AtlasPlugins()

process.on('beforeExit', async () => {
  console.info('Closing connections...')
  await atlasPlugins.close()
  rest.close()
  wss.server.close()
  db.destroy()
  console.info('Bye!')
})
