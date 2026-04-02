import { IConversation } from '@/interface/Conversation'
import { IDepository } from '@/interface/Depository'
import { IServicingKey } from '@/interface/ServicingKey'
import { IUser } from '@/interface/User'
import { Relation } from 'typeorm'

export type IOrganization = {
  uuid: string
  name: string
  servicingKeys: Promise<Relation<IServicingKey>[]>
  users: Promise<Relation<IUser>[]>
  depositories: Promise<Relation<IDepository>[]>
  conversations: Relation<IConversation>[]
  created: Date
}

export type IAPIOrganization = {
  uuid: string
  name: string
  created: Date
}
