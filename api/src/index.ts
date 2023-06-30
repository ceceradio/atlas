import bodyParser from 'body-parser'
import express from 'express'
import { conversationApp } from './conversation'

const app = express()

app.use(bodyParser.json({ type: 'application/json' }))
app.use(conversationApp)

app.listen(process.env.port || 3001)
//then(`Started on port ${process.env.port || 3001}`)
