import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { DataSource, EntityManager } from 'typeorm'

export default async function listChoreDefinitions(
  dataSource: DataSource | EntityManager,
): Promise<string[]> {
  const defs = await dataSource.getRepository(ChoreDefinition).find({
    order: { name: 'ASC' },
  })
  return defs.map((d) => `[${d.size ?? '?'}] ${d.name}`)
}
