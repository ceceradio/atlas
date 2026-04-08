import { IConversation } from '@/interface/Conversation'
import { IDepository } from '@/interface/Depository'
import { OrganizationSettings } from '@/interface/OrganizationSettings'
import { IServicingKey } from '@/interface/ServicingKey'
import { IUser } from '@/interface/User'
import { Relation } from 'typeorm'

export type IOrganization = {
  uuid: string
  name: string
  settings: OrganizationSettings
  servicingKeys: Promise<Relation<IServicingKey>[]>
  users: Promise<Relation<IUser>[]>
  depositories: Promise<Relation<IDepository>[]>
  conversations: Relation<IConversation>[]
  created: Date
}

export type IAPIOrganization = {
  uuid: string
  name: string
  settings: OrganizationSettings
  created: Date
}
