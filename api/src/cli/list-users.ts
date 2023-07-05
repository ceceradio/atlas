import { User } from '@/entity/User'
import { DataSource } from 'typeorm'

export default async function listUsers(
  dataSource: DataSource,
): Promise<string[]> {
  return (await User.list(dataSource)).map((user) =>
    JSON.stringify({ uuid: user.uuid, auth: user.authProfiles[0] }),
  )
}
