import { IOrganization } from '@/interface/Organization'
import { IServicer } from '@/interface/Servicer'

export type IServicingKey = {
  uuid: string
  organization: IOrganization
  servicer: IServicer
  created: Date
}
