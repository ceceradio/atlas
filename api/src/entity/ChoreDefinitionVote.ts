import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity({ synchronize: false })
export class ChoreDefinitionVote {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'text' })
  discordName: string

  @Column({ type: 'date' })
  tallyDate: string
}
