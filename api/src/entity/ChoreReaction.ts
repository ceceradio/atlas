import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity()
export class ChoreReaction {
  @PrimaryColumn()
  name: string

  @Column({ type: 'text', nullable: true })
  discordId: string | null

  @Column({ default: false })
  animated: boolean
}
