import { IServicerAuthProfile } from '@/interface/ServicerAuthProfile'
import { IServicingKey } from '@/interface/ServicingKey'
import { Relation } from 'typeorm'

export type IServicer = {
  uuid: string
  email: string
  authProfiles: Promise<Relation<IServicerAuthProfile>[]>
  servicingKeys: Promise<Relation<IServicingKey>[]>
  createdAt: Date
}
