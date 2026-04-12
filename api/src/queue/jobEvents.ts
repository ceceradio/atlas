import Queue from 'bull'

export type JobEventStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'stalled'

export type JobEventPayload = {
  type: 'jobEvent'
  queue: string
  jobId: string
  status: JobEventStatus
  failedReason: string | null
  result?: unknown
}

type BroadcastFn = (orgId: string, payload: JobEventPayload) => void

export function attachJobEventBroadcaster<T extends { organizationId?: string }>(
  queue: Queue<T>,
  queueName: string,
  broadcast: BroadcastFn,
) {
  queue.on('waiting', async (jobId: string | number) => {
    const job = await queue.getJob(jobId)
    if (!job?.data.organizationId) return
    broadcast(job.data.organizationId, {
      type: 'jobEvent',
      queue: queueName,
      jobId: String(jobId),
      status: 'waiting',
      failedReason: null,
    })
  })

  queue.on('active', (job) => {
    if (!job.data.organizationId) return
    broadcast(job.data.organizationId, {
      type: 'jobEvent',
      queue: queueName,
      jobId: String(job.id),
      status: 'active',
      failedReason: null,
    })
  })

  queue.on('completed', (job, result) => {
    if (!job.data.organizationId) return
    broadcast(job.data.organizationId, {
      type: 'jobEvent',
      queue: queueName,
      jobId: String(job.id),
      status: 'completed',
      failedReason: null,
      result,
    })
  })

  queue.on('failed', (job, error) => {
    if (!job.data.organizationId) return
    broadcast(job.data.organizationId, {
      type: 'jobEvent',
      queue: queueName,
      jobId: String(job.id),
      status: 'failed',
      failedReason: error?.message ?? null,
    })
  })

  queue.on('stalled', (job) => {
    if (!job.data.organizationId) return
    broadcast(job.data.organizationId, {
      type: 'jobEvent',
      queue: queueName,
      jobId: String(job.id),
      status: 'stalled',
      failedReason: null,
    })
  })
}
