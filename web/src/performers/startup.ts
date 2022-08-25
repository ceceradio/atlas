import { AppDataSource } from "../../../models/src/data-source"
import { Servicer } from "../../../models/src/entity/Servicer"
import { Performer, Stage } from "../lib/PerformanceLib"
const { ADMIN_EMAIL } = process.env

export const StartupPerformer = (stage: Stage) => {
    const performer = new Performer(stage)

    performer.onBlocking('lightsOn', async () => {
        await startup()
    })

    return performer
}

async function startup() {
    await AppDataSource.initialize()
    await setupAdmin()
}
async function setupAdmin() {
    const db = AppDataSource.getRepository(Servicer)
    const servicer = await db.findOneBy({
        email: ADMIN_EMAIL
    })
    if (servicer) { return console.debug('Admin already existed')}
    const firstServicer = new Servicer()
    firstServicer.email = (ADMIN_EMAIL ? ADMIN_EMAIL : 'cecelia.wren@gmail.com')
    db.save(firstServicer)
    console.info('admin created')
}
