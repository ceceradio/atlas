import dotenv from 'dotenv'
import path from 'path'

const { STAGE } = process.env
const envFile = '.env.api' + (STAGE ? '.' + STAGE : '')
// use env file in this directory
dotenv.config({ path: path.resolve(process.cwd(), '..', envFile) })

const mustBeDefined = ['OPENAI_API_KEY']
// check that all required env variables are defined
mustBeDefined.forEach((key) => {
  if (typeof process.env[key] === 'undefined') {
    throw new Error(`Missing required env variable ${key}`)
  }
})
