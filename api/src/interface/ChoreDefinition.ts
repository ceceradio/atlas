export type ChoreDifficulty = 'not a chore' | 'small' | 'medium' | 'large' | 'extra large'

export type IChoreDefinition = {
  id: string
  name: string
  size: ChoreDifficulty | null
  aliasOfId: string | null
  voteExpiresAt: string | null
  createdAt: string
}
