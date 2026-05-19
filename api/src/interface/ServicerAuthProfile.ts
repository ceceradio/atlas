import { AuthProviders } from './AuthProviders'
import { IServicer } from './Servicer'

export type IServicerAuthProfile = {
  uuid: string
  provider: AuthProviders
  providerId: string
  servicer: IServicer
  created: Date
}
