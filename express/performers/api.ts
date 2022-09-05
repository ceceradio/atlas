import { ServerPerformer } from './server'
import { servicerApi } from '../api/servicer'
import cors from 'cors'
const { LOCAL_DOMAIN, AUTH0_DOMAIN } = process.env

import { auth } from 'express-oauth2-jwt-bearer'

export class APIPerformer extends ServerPerformer {
  constructor (public port: number) {
    super(port)
  }

  async init (): Promise<void> {
    this.server.use(cors({
      origin: 'https://localhost:3000',
    }))
    this.server.disable('etag');
    this.server.use(auth({
      audience: LOCAL_DOMAIN,
      issuerBaseURL: AUTH0_DOMAIN,
    }))
    this.server.use("/", servicerApi)
    return await super.init()
  }
}
