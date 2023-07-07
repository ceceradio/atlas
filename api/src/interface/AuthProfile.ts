import { AuthProviders } from '@/interface/AuthProviders'
import { IUser } from '@/interface/User'

export type IAuthProfile = {
  uuid: string
  user: IUser
  provider: AuthProviders
  providerId: string
  created: Date
}
