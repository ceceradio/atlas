import { postgres } from '@/data-source'
import { AuthProfile } from '@/entity/AuthProfile'
import { IOrganization, IUser } from '@/interface'
import {
  GetPublicKeyOrSecret,
  Jwt,
  JwtPayload,
  VerifyOptions,
  verify,
} from 'jsonwebtoken'
import { JwksClient } from 'jwks-rsa'
import { WebSocket } from 'ws'

const { AUTH0_DOMAIN } = process.env
const publicKey = `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
const jwksClient = new JwksClient({
  jwksUri: publicKey,
  requestHeaders: {}, // Optional
  timeout: 30000, // Defaults to 30s
})

const getKey: GetPublicKeyOrSecret = (header, callback) => {
  jwksClient
    .getSigningKey(header.kid)
    .then((signingKeyResponse) =>
      callback(null, signingKeyResponse.getPublicKey()),
    )
}

export class UserSocket {
  user?: IUser
  organization?: IOrganization
  token?: string

  constructor(public socket: WebSocket) {}

  async identify(token: string): Promise<boolean> {
    const reset = () => {
      this.user = undefined
      this.organization = undefined
      this.token = undefined
      return false
    }

    this.token = token
    const verification: JwtPayload | string | undefined = await asyncVerify(
      this.token,
      getKey,
      {},
    )
    if (!verification || typeof verification === 'string') return reset()

    const providerId = verification.sub
    if (!providerId) return reset()

    const user = await AuthProfile.getUser(postgres, 'auth0', providerId)
    if (!user) return reset()

    this.user = user
    this.organization = user.organization

    this.socket.send(JSON.stringify({ type: 'identified', user }))
    return true
  }

  close() {
    this.socket.close()
  }

  isIdentified(): boolean {
    return (
      this.user !== undefined && this.organization !== undefined && !!this.token
    )
  }
}

type VerifyReturnValue = Jwt | JwtPayload | string | undefined
const asyncVerify = async (
  token: string,
  getKey: GetPublicKeyOrSecret,
  options: VerifyOptions,
): Promise<VerifyReturnValue> => {
  return new Promise((resolve, reject) => {
    verify(token, getKey, { complete: false, ...options }, (error, decoded) => {
      if (error) return reject(error)
      resolve(decoded)
    })
  })
}
