import { LangfuseTracer } from '@/atlas/ai-compat/langfuse/LangfuseTracer'
import { getLangfuse } from '@/atlas/ai-compat/langfuse/getLangfuse'
import { combiner } from '@/lib/combiner'
import { choreSplitter } from '@/plugins/chores/choreSplitter'

export default async function testCombiner(message: string): Promise<void> {
  console.log(`Input message: "${message}"\n`)
  const today = new Date().toISOString().slice(0, 10)
  const tracer = new LangfuseTracer('testCombiner', 'cli', `testCombiner-${Date.now()}`)

  const [run1, run2, run3] = await Promise.all([
    choreSplitter({ date: today, message }, tracer),
    choreSplitter({ date: today, message }, tracer),
    choreSplitter({ date: today, message }, tracer),
  ])

  console.log('Run 1:', run1.chores)
  console.log('Run 2:', run2.chores)
  console.log('Run 3:', run3.chores)
  console.log()

  const combined = await combiner([run1.chores, run2.chores, run3.chores], tracer)
  console.log('Combined:', combined)

  await getLangfuse().flushAsync()
}
