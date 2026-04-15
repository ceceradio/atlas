import bodyParser from 'body-parser'
import express from 'express'

import { authApp } from './authorize'
import { auditLogApp } from './auditLogApp'
import { choresApp } from './chores'
import { conversationApp } from './conversation'
import { dbMiddleware } from './db'
import { errorHandler } from './errors'
import { organizationApp } from './organization'
import { inviteApp } from './rsvp'
import { inviteManagementApp } from './invite'

export const app = express()

app.use(bodyParser.json({ type: 'application/json' }))
app.use(dbMiddleware)
app.use(authApp)
app.use(inviteApp)
app.use(inviteManagementApp)
app.use(conversationApp)
app.use(choresApp)
app.use(organizationApp)
app.use(auditLogApp)
// errorHandler must go last
app.use(errorHandler)
