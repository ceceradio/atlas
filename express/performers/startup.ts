import { AppDataSource } from '../../models/src/data-source'
import { Servicer } from '../../models/src/entity/Servicer'
import { IPerformer } from '../../interfaces'
const { ADMIN_EMAIL } = process.env

export class StartupPerformer implements IPerformer {
  async init (): Promise<void> { await startup() }
}

async function startup ():Promise<void> {
  await AppDataSource.initialize()
  await setupAdmin()
}
async function setupAdmin ():Promise<void> {
  const db = AppDataSource.getRepository(Servicer)
  const servicer = await db.findOneBy({
    email: ADMIN_EMAIL
  })
  if (servicer != null) { return console.debug('Admin already existed') }
  const firstServicer = new Servicer()
  firstServicer.email = (ADMIN_EMAIL!=null) ? ADMIN_EMAIL : 'cecelia.wren@gmail.com'
  await db.save(firstServicer)
  console.debug(`admin created for ${firstServicer.email}`)
}
