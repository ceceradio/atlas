import 'reflect-metadata'
//
import { AuthProfile } from '@/entity/AuthProfile'
import { Conversation } from '@/entity/Conversation'
import { Depository } from '@/entity/Depository'
import { Message } from '@/entity/Message'
import { Organization } from '@/entity/Organization'
import { Servicer } from '@/entity/Servicer'
import { ServicerAuthMethod } from '@/entity/ServicerAuthMethod'
import { ServicingKey } from '@/entity/ServicingKey'
import { User } from '@/entity/User'
import { DataSource } from 'typeorm'

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
    AuthProfile,
    User,
    Conversation,
    Message,
  ],
  migrations: ['./migration/*.{js,ts}'],
  subscribers: [],
})
const initializePromise = AppDataSource.initialize()
export async function getDataSource() {
  return await initializePromise
}
