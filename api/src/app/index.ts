import bodyParser from 'body-parser'
import express from 'express'
import { atlasApp } from './atlas'
import { authApp } from './authorize'
import { conversationApp } from './conversation'
import { errorHandler } from './errors'
import { inviteApp } from './rsvp'

export const app = express()

app.use(bodyParser.json({ type: 'application/json' }))
app.use(authApp)
app.use(atlasApp)
app.use(inviteApp)
app.use(conversationApp)
// errorHandler must go last
app.use(errorHandler)
