import { IOrganization } from './Organization'

export type IDepository = {
  uuid: string
  organization: IOrganization
  created: Date
}
