import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { upsertJob, clearFinished, type JobStatus } from '@/store/jobsSlice'
import { atlasApi, useGetQueueSnapshotQuery } from '@/store/atlasApi'
import useAtlasSocket from '@/helpers/useAtlasSocket'
import { selectToken } from '@/store/authSlice'
import { useSelector } from 'react-redux'

type JobEventMessage = {
  type: 'jobEvent'
  queue: string
  jobId: string
  status: JobStatus
  failedReason: string | null
  result?: unknown
}

export function JobQueueMonitor() {
  const dispatch = useDispatch()
  const token = useSelector(selectToken)
  const { lastJsonMessage } = useAtlasSocket()
  const { data: snapshot } = useGetQueueSnapshotQuery(undefined, { skip: !token })

  // Hydrate from snapshot on mount
  useEffect(() => {
    if (!snapshot) return
    for (const item of snapshot) {
      dispatch(upsertJob(item))
    }
  }, [snapshot, dispatch])

  // Listen for real-time job events
  useEffect(() => {
    const message = lastJsonMessage as { type: string } | null
    if (!message || message.type !== 'jobEvent') return
    const event = message as JobEventMessage
    dispatch(upsertJob({
      jobId: event.jobId,
      queue: event.queue,
      status: event.status,
      failedReason: event.failedReason,
      result: event.result,
    }))

    const done = event.status === 'completed' || event.status === 'failed'
    if (done && event.queue === 'chores') {
      dispatch(atlasApi.util.invalidateTags(['Chores', 'ChoreMessages']))
    }
    if (done && (event.queue === 'choreDefinitionDiscovery' || event.queue === 'choreDefinitionVoteTally')) {
      dispatch(atlasApi.util.invalidateTags(['ChoreDefinitions']))
    }
  }, [lastJsonMessage, dispatch])

  // Prune finished jobs every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => dispatch(clearFinished()), 10_000)
    return () => clearInterval(interval)
  }, [dispatch])

  return null
}
