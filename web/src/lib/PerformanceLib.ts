export type Action = string

export class Performer {
    constructor (public stage: Stage) {}
    
    onBlocking(action:Action, fn:Function):void {
        this.stage.addBlocking(action, this, fn)
    }
}

export class Stage {
    performers: Performer[] = []
    blockings: Record<string, {performer:Performer, fn:Function}[]> = {}
    addBlocking(on:Action, performer: Performer, fn:Function) {
        this.blockings[on] = [...(this.blockings[on]||[]), {performer, fn}]
    }
    async act(action: Action, data: any) {
        const blockingActors = this.blockings[action]
        const promises = blockingActors.map(async (blockingActor) => {
            await blockingActor.fn(data)
        })
        return Promise.all(promises)
    }
    addPerformer(performer: Performer) {
        if (!this.performers.includes(performer))
            this.performers = [...this.performers, performer]
    }
}