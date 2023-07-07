import { AuthProviders } from '@/interface/AuthProviders'
import { IServicer } from '@/interface/Servicer'

export type IServicerAuthProfile = {
  uuid: string
  provider: AuthProviders
  providerId: string
  servicer: IServicer
  created: Date
}
