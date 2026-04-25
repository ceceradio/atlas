import Queue from 'bull'
import { redisConfig } from '@/queue/redis'

const QUEUE_NAMES = ['choreMessage', 'choreDefinitionDiscovery']
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export default async function reprocessFailedChoreJobs(): Promise<string> {
  const cutoff = Date.now() - ONE_DAY_MS
  const lines: string[] = []
  let totalRetried = 0

  for (const name of QUEUE_NAMES) {
    const queue = new Queue(name, { redis: redisConfig })
    try {
      const failed = await queue.getFailed()
      const recent = failed.filter((job) => (job.finishedOn ?? job.timestamp) >= cutoff)

      lines.push(`${name}: ${recent.length} failed job(s) in last 24h`)
      for (const job of recent) {
        const label = JSON.stringify(job.data).slice(0, 80)
        try {
          await job.retry()
          lines.push(`  ✓ retried job ${job.id} — ${label}`)
          totalRetried++
        } catch (err) {
          lines.push(`  ✗ failed to retry job ${job.id} — ${err}`)
        }
      }
    } finally {
      await queue.close()
    }
  }

  lines.push(`\nTotal retried: ${totalRetried}`)
  return lines.join('\n')
}
