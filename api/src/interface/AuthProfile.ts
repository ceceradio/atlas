import { AuthProviders } from './AuthProviders'
import { IUser } from './User'

export type IAuthProfile = {
  uuid: string
  user: IUser
  provider: AuthProviders
  providerId: string
  created: Date
}
