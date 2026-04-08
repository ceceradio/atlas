import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'
import { Chore } from './Chore'

@Entity()
export class ChoreMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index({ unique: true })
  @Column()
  discordMessageId: string

  @Column()
  discordChannelId: string

  @Column({ type: 'text', nullable: true })
  content: string | null

  @Column()
  discordAuthorId: string

  @Column()
  discordAuthorName: string

  @Column({ type: 'timestamp' })
  postedAt: Date

  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date | null

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @OneToMany(() => Chore, (chore) => chore.choreMessage, { cascade: true })
  chores: Relation<Chore>[]
}
