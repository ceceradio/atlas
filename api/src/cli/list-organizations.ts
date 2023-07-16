import { Organization } from '@/entity/Organization'
import { DataSource } from 'typeorm'

export default async function listOrganizations(
  dataSource: DataSource | EntityManager,
): Promise<string[]> {
  return (await Organization.list(dataSource)).map((org) => org.uuid)
}
