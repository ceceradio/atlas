import { postgres } from '@/data-source'
import { AuthProfile } from '@/entity/AuthProfile'
import { AuthProviders } from '@/entity/AuthProviders'
import { User } from '@/entity/User'
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
  checkJwt(request, response, (err?: Error) => {
    if (err) return next(err)
    const providerId = request.auth?.payload?.sub
    if (!providerId) return response.sendStatus(400)
    AuthProfile.getUser(postgres, AuthProviders.AUTH0, providerId)
      .then((user) => {
        response.locals.user = user
        next()
      })
      .catch((e) => {
        console.error(e)
        return response.sendStatus(401)
      })
  })
}

export const authApp = express()

authApp.get('/whoami', authorize, (request, response) => {
  const user: User = response.locals.user
  return response.json(user.toApi())
})

authApp.patch('/user', authorize, async (request, response, next) => {
  try {
    const user: User = response.locals.user
    const { color, discordUsername } = request.body as { color?: string; discordUsername?: string }
    if (color !== undefined) user.color = color || undefined
    if (discordUsername !== undefined) user.discordUsername = discordUsername || null
    if (color !== undefined || discordUsername !== undefined) {
      await postgres.getRepository(User).save(user)
    }
    return response.json(user.toApi())
  } catch (e) {
    next(e)
  }
})
