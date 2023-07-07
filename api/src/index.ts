import { app } from './app'
export * from './interface'

app.listen(process.env.port || 3001)
