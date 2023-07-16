import 'reflect-metadata'
//
import { Organization } from '@/entity/Organization'
import { DataSource } from 'typeorm'

export default async function registerOrganization(
  dataSource: DataSource | EntityManager,
): Promise<string> {
  return (await Organization.create(dataSource)).uuid
}
