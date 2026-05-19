import { IConversation } from './Conversation'
import { IDepository } from './Depository'
import { OrganizationSettings } from './OrganizationSettings'
import { IServicingKey } from './ServicingKey'
import { IUser } from './User'
type Relation<T> = T

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
