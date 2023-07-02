import bodyParser from 'body-parser'
import express from 'express'
import { conversationApp } from './apps/conversation'

const app = express()

app.use(bodyParser.json({ type: 'application/json' }))
app.use(conversationApp)

app.listen(process.env.port || 3001)
//then(`Started on port ${process.env.port || 3001}`)
