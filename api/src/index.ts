export * from './interface'
export { AtlasSocketMessage, ChatMessage, Snapshot } from './ws'
import { DataSource } from 'typeorm'
import { app } from './app'
import { getDataSource } from './data-source'
import { Organization } from './entity/Organization'
import { initAtlasPlugins } from './plugins'
import { AtlasWebsocketServer } from './ws'

const atlasPlugins = initAtlasPlugins()

let db: DataSource
getDataSource().then(async (_db) => {
  db = _db
  console.log('Database initialized')
  const orgs = await Organization.list(db)
  for (const org of orgs) {
    const channelId = org.settings?.discord?.choresChannelId
    if (channelId) atlasPlugins.initChoreMonitor(db, channelId)
  }
})

const rest = app.listen(process.env.port || 3001)
rest.setTimeout(10 * 60 * 1000)

const wss = new AtlasWebsocketServer({
  port: parseInt(process.env.wsPort || '3002'),
})

process.on('beforeExit', async () => {
  console.info('Closing connections...')
  await atlasPlugins.close()
  rest.close()
  wss.server.close()
  db.destroy()
  console.info('Bye!')
})
