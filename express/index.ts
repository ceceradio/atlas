import { IPerformer } from '../interfaces'
import { APIPerformer } from './performers/api'
import { StartupPerformer } from './performers/startup'
const { API_PORT } = process.env

main().catch((e) => { console.error(e) })
async function main (): Promise<void> {
  const stage: IPerformer[] = []

  stage.push(new StartupPerformer())
  const port = (API_PORT != null) ? Number(API_PORT) : 8000
  stage.push(new APIPerformer(port))

  stage.forEach((performer) => { performer.init().catch((e) => { console.error(e) }) })
}
