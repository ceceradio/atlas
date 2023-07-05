import 'reflect-metadata'
//
import registerOrganization from '@/cli/register-organization'
import registerUser from '@/cli/register-user'
import { getDataSource } from '@/data-source'
import minimist from 'minimist'
import listUsers from './list-users'

const argv = minimist(process.argv.slice(2))
const [command] = argv._
getDataSource().then(async (dataSource) => {
  if (command === 'registerUser') {
    await registerUser(dataSource, argv.orgId).then(console.log)
  } else if (command === 'registerOrganization') {
    await registerOrganization(dataSource).then(console.log)
  } else if (command === 'listUsers') {
    await listUsers(dataSource).then(console.log)
  }
  await dataSource.destroy()
})
