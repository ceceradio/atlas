import 'reflect-metadata'
//
import listUsers from '@/cli/list-users'
import registerOrganization from '@/cli/register-organization'
import registerUser from '@/cli/register-user'
import { getDataSource } from '@/data-source'
import minimist from 'minimist'
import { DataSource } from 'typeorm'
import retitleConversation from './retitle-conversation'

const argv = minimist(process.argv.slice(2))
const [command] = argv._
let dataSourceHandle: DataSource
getDataSource()
  .then(async (dataSource) => {
    dataSourceHandle = dataSource
    if (command === 'registerUser') {
      return registerUser(dataSource, argv.uuid)
    } else if (command === 'registerOrganization') {
      return registerOrganization(dataSource)
    } else if (command === 'listUsers') {
      return listUsers(dataSource)
    } else if (command === 'retitleConversation') {
      return retitleConversation(dataSource, argv.uuid)
    }
    await dataSource.destroy()
  })
  .then(console.info)
  .then(() => dataSourceHandle.destroy())
