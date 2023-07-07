import 'reflect-metadata'
//
import { AuthProfile } from '@/entity/AuthProfile'
import { Conversation } from '@/entity/Conversation'
import { Depository } from '@/entity/Depository'
import { Message } from '@/entity/Message'
import { Organization } from '@/entity/Organization'
import { Servicer } from '@/entity/Servicer'
import { ServicerAuthProfile } from '@/entity/ServicerAuthProfile'
import { ServicingKey } from '@/entity/ServicingKey'
import { User } from '@/entity/User'
import { DataSource } from 'typeorm'

export const postgres = new DataSource({
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
    ServicerAuthProfile,
    ServicingKey,
    AuthProfile,
    User,
    Conversation,
    Message,
  ],
  migrations: ['./migration/*.{js,ts}'],
  subscribers: [],
})
const initializePromise = postgres.initialize()
export async function getDataSource() {
  return await initializePromise
}
