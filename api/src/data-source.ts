import 'reflect-metadata'
import { DataSource } from 'typeorm'
import { Conversation } from '../../api/src/entity/Conversation'
import { Depository } from '../../api/src/entity/Depository'
import { Message } from '../../api/src/entity/Message'
import { Organization } from '../../api/src/entity/Organization'
import { Servicer } from '../../api/src/entity/Servicer'
import { ServicerAuthMethod } from '../../api/src/entity/ServicerAuthMethod'
import { ServicingKey } from '../../api/src/entity/ServicingKey'
import { User } from '../../api/src/entity/User'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'postgres',
  database: 'postgres',
  synchronize: true,
  logging: false,
  entities: [
    Depository,
    Organization,
    Servicer,
    ServicerAuthMethod,
    ServicingKey,
    User,
    Conversation,
    Message,
  ],
  migrations: ['./migration/*.ts'],
  subscribers: [],
})
const initializePromise = AppDataSource.initialize()
export async function getDataSource() {
  return await initializePromise
}
