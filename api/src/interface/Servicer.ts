import { IServicerAuthProfile } from './ServicerAuthProfile'
import { IServicingKey } from './ServicingKey'
type Relation<T> = T

export type IServicer = {
  uuid: string
  email: string
  authProfiles: Promise<Relation<IServicerAuthProfile>[]>
  servicingKeys: Promise<Relation<IServicingKey>[]>
  createdAt: Date
}
