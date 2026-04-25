import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from './index'

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'stalled'

export type JobEntry = {
  jobId: string
  queue: string
  status: JobStatus
  failedReason: string | null
  result?: unknown
  updatedAt: number
}

type JobsState = Record<string, JobEntry>

const STATUS_RANK: Record<JobStatus, number> = {
  waiting: 0,
  active: 1,
  stalled: 2,
  completed: 3,
  failed: 3,
}

const jobsSlice = createSlice({
  name: 'jobs',
  initialState: {} as JobsState,
  reducers: {
    upsertJob(state, action: PayloadAction<Omit<JobEntry, 'updatedAt'>>) {
      const existing = state[action.payload.jobId]
      if (existing && STATUS_RANK[action.payload.status] < STATUS_RANK[existing.status]) return
      state[action.payload.jobId] = { ...action.payload, updatedAt: Date.now() }
    },
    dismissJob(state, action: PayloadAction<string>) {
      delete state[action.payload]
    },
    clearFinished(state) {
      const cutoff = Date.now() - 30_000
      for (const id of Object.keys(state)) {
        const job = state[id]
        if (job.status === 'failed' && job.updatedAt < cutoff) {
          delete state[id]
        }
      }
    },
  },
})

export const { upsertJob, dismissJob, clearFinished } = jobsSlice.actions
export default jobsSlice.reducer

export const selectAllJobs = createSelector(
  (state: RootState) => state.jobs,
  (jobs) => Object.values(jobs),
)
