import express from 'express'
import { AppDataSource } from '../../../../models/src/data-source'
import { Servicer } from '../../../../models/src/entity/Servicer'
import { Performer, Stage } from '../../lib/PerformanceLib'
const { PORT, ADMIN_EMAIL } = process.env
const port = PORT || 8000

const server = express()

export const ServerPerformer = (stage: Stage) => {
    const performer = new Performer(stage)

    performer.onBlocking('lightsOn', async () => {
        server.listen(port, () => {
            console.log(`server started at http://localhost:${port}`);
        })
    })
    
    return performer
}


server.get("/", async (req, res) => {
    res.send([... (await AppDataSource.getRepository(Servicer).find())]);
})

