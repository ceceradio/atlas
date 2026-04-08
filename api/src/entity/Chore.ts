import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'
import { ChoreMessage } from './ChoreMessage'

export type ChoreAIOriginal = {
  description: string
  doneAt: string
  difficulty: string
}

@Entity()
export class Chore {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => ChoreMessage, (choreMessage) => choreMessage.chores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  choreMessage: Relation<ChoreMessage>

  @Column()
  description: string

  @Column({ type: 'date' })
  doneAt: Date

  @Column()
  difficulty: string

  @Column({ type: 'jsonb' })
  aiOriginal: ChoreAIOriginal

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  toApi() {
    return {
      id: this.id,
      description: this.description,
      doneAt: this.doneAt,
      difficulty: this.difficulty,
      aiOriginal: this.aiOriginal,
      choreMessage: this.choreMessage
        ? {
            id: this.choreMessage.id,
            discordMessageId: this.choreMessage.discordMessageId,
            discordAuthorId: this.choreMessage.discordAuthorId,
            discordAuthorName: this.choreMessage.discordAuthorName,
            postedAt: this.choreMessage.postedAt,
            editedAt: this.choreMessage.editedAt,
          }
        : undefined,
    }
  }
}
