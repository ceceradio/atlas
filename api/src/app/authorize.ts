import { postgres } from '@/data-source'
import { AuthProfile } from '@/entity/AuthProfile'
import { AuthProviders } from '@/entity/AuthProviders'
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
    if (!providerId) return response.status(400)
    AuthProfile.getUser(postgres, AuthProviders.AUTH0, providerId)
      .then((user) => {
        response.locals.user = user
        next()
      })
      .catch((e) => {
        console.error(e)
        return response.status(401)
      })
  })
}

export const authApp = express()

authApp.get('/whoami', checkJwt, (request, response) => {
  return response.json(response.locals.user)
})
