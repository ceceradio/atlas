import { Organization } from '@/entity/Organization'
import { DataSource } from 'typeorm'

export default async function listOrganizations(
  dataSource: DataSource,
): Promise<string[]> {
  return (await Organization.list(dataSource)).map((org) => org.uuid)
}
