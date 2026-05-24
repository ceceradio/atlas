import 'reflect-metadata'
//
import { AuditLog } from '@/entity/AuditLog'
import { AuthProfile } from '@/entity/AuthProfile'
import { Chore } from '@/entity/Chore'
import { ChoreChunk } from '@/entity/ChoreChunk'
import { ChoreDefinition } from '@/entity/ChoreDefinition'
import { ChoreDefinitionMatch } from '@/entity/ChoreDefinitionMatch'
import { ChoreDefinitionVote } from '@/entity/ChoreDefinitionVote'
import { ChoreMessage } from '@/entity/ChoreMessage'
import { ChoreReaction } from '@/entity/ChoreReaction'
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
  synchronize: true,
  migrationsRun: true,
  logging: false,
  entities: [
    AuditLog,
    Depository,
    Organization,
    Servicer,
    ServicerAuthProfile,
    ServicingKey,
    AuthProfile,
    User,
    Conversation,
    Message,
    ChoreMessage,
    Chore,
    ChoreChunk,
    ChoreDefinition,
    ChoreDefinitionMatch,
    ChoreDefinitionVote,
    ChoreReaction,
  ],
  migrations: [__dirname + '/migration/*.{js,ts}'],
  subscribers: [],
})
const initializePromise = postgres.initialize()
export async function getDataSource() {
  return await initializePromise
}
