export type ChoreDifficulty = 'not a chore' | 'small' | 'medium' | 'large' | 'extra large'

export type IChoreDefinitionLastDone = {
  doneAt: string
  choreId: string
  choreDescription: string
  choreDifficulty: string
  authorName: string
}

export type IChoreDefinition = {
  id: string
  name: string
  size: ChoreDifficulty | null
  aliasOfId: string | null
  voteExpiresAt: string | null
  createdAt: string
  lastDone: IChoreDefinitionLastDone | null
}
