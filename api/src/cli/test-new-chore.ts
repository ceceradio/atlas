import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { getLangfuse } from '@/atlas/ai-compat/langfuse/getLangfuse'
import { identifyNewChoreDefinitions } from '@/plugins/chores/identifyNewChoreDefinitions'

export default async function testNewChore(choreString: string): Promise<void> {
  console.log(`Testing chore: "${choreString}"`)
  const tracer = new LangfuseTracer('testNewChore', 'cli', `testNewChore-${Date.now()}`)
  const newChores = await identifyNewChoreDefinitions([choreString], tracer)
  if (newChores.length > 0) {
    console.log(`Result: NEW chore definition`)
  } else {
    console.log(`Result: matches an existing chore definition`)
  }
  await getLangfuse().flushAsync()
}
