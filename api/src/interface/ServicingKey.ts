import { IOrganization } from './Organization'
import { IServicer } from './Servicer'

export type IServicingKey = {
  uuid: string
  organization: IOrganization
  servicer: IServicer
  created: Date
}
