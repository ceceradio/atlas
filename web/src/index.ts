import { Stage } from "./lib/PerformanceLib"
import { ServerPerformer } from "./performers/server"
import { StartupPerformer } from "./performers/startup"

main()
async function main() {
    const stage = new Stage()
    const startupPerformer =  StartupPerformer(stage)
    const serverPerformer = ServerPerformer(stage)
    await stage.act('lightsOn', undefined)
}