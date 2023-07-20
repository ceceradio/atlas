import { User } from '@/entity/User'
import { DataSource, EntityManager } from 'typeorm'

export default async function listUsers(
  dataSource: DataSource | EntityManager,
): Promise<string[]> {
  return (await User.list(dataSource)).map((user) =>
    JSON.stringify({
      uuid: user.uuid,
      auth: user.authProfiles,
      inviteCode: user.inviteCode,
    }),
  )
}
