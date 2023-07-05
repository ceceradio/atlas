import bodyParser from 'body-parser'
import express from 'express'
import { authApp } from './apps/auth'
import { conversationApp } from './apps/conversation'
import { inviteApp } from './apps/rsvp'

const app = express()

app.use(bodyParser.json({ type: 'application/json' }))
app.use(authApp)
app.use(inviteApp)
app.use(conversationApp)

app.listen(process.env.port || 3001)
//then(`Started on port ${process.env.port || 3001}`)
