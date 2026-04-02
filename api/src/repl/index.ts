import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { processChoreMessage } from '@/plugins/chores/processChoreMessage'
import crypto from 'crypto'
import { start } from 'repl'

async function initializeRepl() {
  const state = {
    tracer: new LangfuseTracer('atlas-repl', 'repl', crypto.randomUUID()), // You can replace 'cece' with any user name you'd like
    processChoreMessage,
  }
  const repl = start('atlas > ')
  Object.assign(repl.context, state)
  repl.setupHistory(`./.repl-history`, (err) => {
    if (err) console.error(err)
  })
}

initializeRepl().then(() => Function.prototype, console.error)
