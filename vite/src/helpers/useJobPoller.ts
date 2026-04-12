import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { selectAllJobs } from '@/store/jobsSlice'

const DONE_STATUSES = ['completed', 'failed']

/**
 * Tracks multiple concurrent reprocess jobs. Uses the Redux job store
 * (populated by JobQueueMonitor via WebSocket) to determine running status —
 * no polling needed. Cache invalidation is also handled by JobQueueMonitor.
 */
export function useJobPoller() {
  // choreMessageId → jobId
  const [activeJobs, setActiveJobs] = useState<Map<string, string>>(new Map())
  const allJobs = useSelector(selectAllJobs)

  const jobStatusById = useMemo(
    () => new Map(allJobs.map((j) => [j.jobId, j.status])),
    [allJobs],
  )

  return {
    start(choreMessageId: string, jobId: string | number) {
      setActiveJobs((prev) => new Map(prev).set(choreMessageId, String(jobId)))
    },
    isRunning(choreMessageId: string) {
      const jobId = activeJobs.get(choreMessageId)
      if (!jobId) return false
      const status = jobStatusById.get(jobId)
      // Treat "not yet in store" as still running (job was just queued)
      return !status || !DONE_STATUSES.includes(status)
    },
  }
}
