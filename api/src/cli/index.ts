import 'reflect-metadata'
//
import listChoreDefinitions from '@/cli/list-chore-definitions'
import listUsers from '@/cli/list-users'
import registerOrganization from '@/cli/register-organization'
import registerUser from '@/cli/register-user'
import seedChoreDefinitions from '@/cli/seed-chore-definitions'
import backfillChoreEmbeddings from '@/cli/backfill-chore-embeddings'
import testChoreMatching from '@/cli/test-chore-matching'
import testNewChore from '@/cli/test-new-chore'
import reprocessFailedChoreJobs from '@/cli/reprocess-failed-chore-jobs'
import { getDataSource } from '@/data-source'
import minimist from 'minimist'
import { DataSource } from 'typeorm'
import respond from './respond'
import responseEvaluation from './response-evaluation'
import retitleConversation from './retitle-conversation'
export { listChoreDefinitions, listUsers, registerOrganization, registerUser, retitleConversation, seedChoreDefinitions, backfillChoreEmbeddings, testChoreMatching, testNewChore, reprocessFailedChoreJobs }

if (require.main === module) {
  const argv = minimist(process.argv.slice(2))
  const [command] = argv._
  let dataSourceHandle: DataSource
  getDataSource()
    .then(async (dataSource) => {
      dataSourceHandle = dataSource
      if (command === 'registerUser') {
        return await registerUser(dataSource, argv.uuid, argv.name)
      } else if (command === 'registerOrganization') {
        return await registerOrganization(dataSource, argv.name)
      } else if (command === 'listUsers') {
        return await listUsers(dataSource)
      } else if (command === 'listChoreDefinitions') {
        return await listChoreDefinitions(dataSource)
      } else if (command === 'retitleConversation') {
        return await retitleConversation(dataSource, argv.uuid)
      } else if (command === 'responseEvaluation') {
        return await responseEvaluation(dataSource, argv.uuid)
      } else if (command === 'respond') {
        return await respond(dataSource, argv.uuid)
      } else if (command === 'seedChoreDefinitions') {
        return await seedChoreDefinitions(dataSource)
      } else if (command === 'backfillChoreEmbeddings') {
        return await backfillChoreEmbeddings(dataSource, !!argv.overwrite)
      } else if (command === 'testChoreMatching') {
        return await testChoreMatching()
      } else if (command === 'testNewChore') {
        const choreString = argv._.slice(1).join(' ')
        return await testNewChore(choreString)
      } else if (command === 'reprocessFailedChoreJobs') {
        return await reprocessFailedChoreJobs()
      }
    })
    .then(console.info)
    .catch((e) => {
      console.error(e.response)
    })
    .finally(() => {
      dataSourceHandle
        .destroy()
        .then(() => process.exit(1))
        .catch((e) => {
          console.error(e)
        })
    })
}
