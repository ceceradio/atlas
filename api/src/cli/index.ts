import 'reflect-metadata'
//
import listUsers from '@/cli/list-users'
import registerOrganization from '@/cli/register-organization'
import registerUser from '@/cli/register-user'
import { getDataSource } from '@/data-source'
import minimist from 'minimist'
import { DataSource } from 'typeorm'
import respond from './respond'
import responseEvaluation from './response-evaluation'
import retitleConversation from './retitle-conversation'
export { listUsers, registerOrganization, registerUser, retitleConversation }

if (require.main === module) {
  const argv = minimist(process.argv.slice(2))
  const [command] = argv._
  let dataSourceHandle: DataSource
  getDataSource()
    .then(async (dataSource) => {
      dataSourceHandle = dataSource
      if (command === 'registerUser') {
        return await registerUser(dataSource, argv.uuid)
      } else if (command === 'registerOrganization') {
        return await registerOrganization(dataSource)
      } else if (command === 'listUsers') {
        return await listUsers(dataSource)
      } else if (command === 'retitleConversation') {
        return await retitleConversation(dataSource, argv.uuid)
      } else if (command === 'responseEvaluation') {
        return await responseEvaluation(dataSource, argv.uuid)
      } else if (command === 'respond') {
        return await respond(dataSource, argv.uuid)
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
