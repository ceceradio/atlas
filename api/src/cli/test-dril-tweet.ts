import { getLangfuse } from '@/atlas/ai-compat/langfuse/getLangfuse'
import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { generateDrilTweet } from '@/plugins/chores/drilTweet'
import minimist from 'minimist'
import { randomUUID } from 'crypto'

export default async function testDrilTweetCli(): Promise<string> {
  const argv = minimist(process.argv.slice(2))
  const chore = argv.chore ?? argv._.slice(1).join(' ')
  if (!chore) return 'Usage: npm run cli testDrilTweet -- --chore "your chore here"'

  const tracer = new LangfuseTracer('testDrilTweet', 'cli', randomUUID(), {
    tags: ['test'],
  })
  const tweet = await generateDrilTweet(chore, tracer)
  await getLangfuse().flushAsync()
  return tweet
}
