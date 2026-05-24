import 'reflect-metadata'
//
import listChoreDefinitions from '@/cli/list-chore-definitions'
import listUsers from '@/cli/list-users'
import registerOrganization from '@/cli/register-organization'
import registerUser from '@/cli/register-user'
import seedChoreDefinitions from '@/cli/seed-chore-definitions'
import backfillChoreChunks from '@/cli/backfill-chore-chunks'
import backfillChoreDefinitionMatches from '@/cli/backfill-chore-definition-matches'
import backfillChoreEmbeddings from '@/cli/backfill-chore-embeddings'
import backfillChoreReactions from '@/cli/backfill-chore-reactions'
import testChoreMatching from '@/cli/test-chore-matching'
import testNewChore from '@/cli/test-new-chore'
import reprocessFailedChoreJobs from '@/cli/reprocess-failed-chore-jobs'
import postWeeklySuperlatives from '@/cli/post-weekly-superlatives'
import testCombiner from '@/cli/test-combiner'
import evalCombiner from '@/cli/eval-combiner'
import testDrilTweet from '@/cli/test-dril-tweet'
import { getDataSource } from '@/data-source'
import minimist from 'minimist'
import { DataSource } from 'typeorm'
import respond from './respond'
import responseEvaluation from './response-evaluation'
import retitleConversation from './retitle-conversation'
export { listChoreDefinitions, listUsers, registerOrganization, registerUser, retitleConversation, seedChoreDefinitions, backfillChoreChunks, backfillChoreDefinitionMatches, backfillChoreEmbeddings, backfillChoreReactions, testChoreMatching, testNewChore, reprocessFailedChoreJobs, postWeeklySuperlatives, testCombiner, evalCombiner, testDrilTweet }

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
      } else if (command === 'backfillChoreChunks') {
        return await backfillChoreChunks(dataSource, !!argv.overwrite)
      } else if (command === 'backfillChoreDefinitionMatches') {
        return await backfillChoreDefinitionMatches(dataSource, !!argv.overwrite)
      } else if (command === 'backfillChoreEmbeddings') {
        return await backfillChoreEmbeddings(dataSource, !!argv.overwrite)
      } else if (command === 'testChoreMatching') {
        return await testChoreMatching()
      } else if (command === 'testNewChore') {
        const choreString = argv._.slice(1).join(' ')
        return await testNewChore(choreString)
      } else if (command === 'reprocessFailedChoreJobs') {
        return await reprocessFailedChoreJobs()
      } else if (command === 'backfillChoreReactions') {
        return await backfillChoreReactions(dataSource)
      } else if (command === 'postWeeklySuperlatives') {
        return await postWeeklySuperlatives()
      } else if (command === 'testCombiner') {
        const msg = argv._.slice(1).join(' ')
        return await testCombiner(msg)
      } else if (command === 'evalCombiner') {
        return await evalCombiner()
      } else if (command === 'testDrilTweet') {
        return await testDrilTweet()
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
