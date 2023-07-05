import { AppDataSource } from '@/data-source'
import { AuthProfile } from '@/entity/AuthProfile'
import express from 'express'
import { auth } from 'express-oauth2-jwt-bearer'

const { AUTH0_AUDIENCE, AUTH0_DOMAIN } = process.env

const config = {
  tokenSigningAlg: 'RS256',
  audience: AUTH0_AUDIENCE,
  issuerBaseURL: `https://${AUTH0_DOMAIN}`,
}

export const checkJwt = auth(config)
export const authorize: express.Handler = (request, response, next) => {
  checkJwt(request, response, () => {
    const providerId = request.auth?.payload?.sub
    if (!providerId) throw new Error('401')
    AuthProfile.getUser(AppDataSource, 'auth0', providerId)
      .then((user) => {
        response.locals.user = user
        next()
      })
      .catch((e) => {
        console.error(e)
        throw new Error('401')
      })
  })
}

export const authApp = express()

authApp.get('/whoami', checkJwt, (request, response) => {
  const userId = request.auth?.payload?.sub
  return response.json({ userId })
})
