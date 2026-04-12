export type DatedChoresRaw = {
  date: string
  message: string
}

export type DatedChores = {
  date: string
  chores: string[]
}

export type ChoreDifficulty = 'not a chore' | 'small' | 'medium' | 'large' | 'extra large'

export type DatedRatedChores = {
  date: string
  chores: RatedChore[]
}

export type RatedChore = {
  chore: string
  difficulty: ChoreDifficulty
}
