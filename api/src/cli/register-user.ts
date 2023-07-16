import { Organization } from '@/entity/Organization'
import { User } from '@/entity/User'
import { DataSource, EntityManager } from 'typeorm'

const { LOCAL_DOMAIN } = process.env

// returns an invite url to register the user's login details
export default async function registerUser(
  dataSource: DataSource | EntityManager,
  organizationId: string,
): Promise<string> {
  const organization = await Organization.get(dataSource, organizationId)
  const user = await User.create(dataSource, organization)
  //@todo create an invite handler in the app and api
  return `https://${LOCAL_DOMAIN}/rsvp?inviteCode=${user.inviteCode}`
}
