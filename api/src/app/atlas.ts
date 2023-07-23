import { atlasApi } from '@/atlas'
import express, { RequestHandler } from 'express'

export const atlasHandler: RequestHandler = async (request, response, next) => {
  response.locals.atlas = atlasApi
  next()
}
export const atlasApp = express()
atlasApp.use(atlasHandler)
