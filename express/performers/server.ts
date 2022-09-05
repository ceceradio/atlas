import express, { Express } from 'express'
import { IPerformer } from '../../interfaces'

export class ServerPerformer implements IPerformer {
  public server: Express
  constructor (public port: number) {
    this.server = express()
  }

  async init (): Promise<void> {
    this.server.listen(this.port, () => {
      console.log(`server started at http://localhost:${this.port}`)
    })
  }
}
