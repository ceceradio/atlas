import 'reflect-metadata'
//
import { Organization } from '@/entity/Organization'
import { DataSource, EntityManager } from 'typeorm'

export default async function registerOrganization(
  dataSource: DataSource | EntityManager,
  name: string,
): Promise<string> {
  return (await Organization.create(dataSource, name)).uuid
}
