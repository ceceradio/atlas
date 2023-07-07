import retitleConversation from '@/cli/retitle-conversation'
import { getDataSource } from '@/data-source'
import Queue from 'bull'
export const retitleQueue = new Queue<RetitleJobData>('retitle')

type RetitleJobData = {
  uuid: string
}
retitleQueue.process(async (job) => {
  const db = await getDataSource()
  return retitleConversation(db, job.data.uuid)
})
