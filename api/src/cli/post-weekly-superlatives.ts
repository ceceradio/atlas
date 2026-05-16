import { getLangfuse } from '@/atlas/ai-compat/langfuse/getLangfuse'
import { initAtlasPlugins } from '@/plugins'
import { postWeeklySuperlatives } from '@/queue/choreWeeklySuperlatives'
import minimist from 'minimist'

export default async function postWeeklySuperlativesCli(): Promise<string> {
  const { 'dry-run': dryRun } = minimist(process.argv.slice(2))
  initAtlasPlugins()
  await postWeeklySuperlatives(!!dryRun)
  await getLangfuse().flushAsync()
  return 'Done.'
}
