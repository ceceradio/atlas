import { IOrganization } from '@/interface/Organization'

export type IDepository = {
  uuid: string
  organization: IOrganization
  created: Date
}
