import { ChoreDifficulty } from '@/plugins/chores/ChoreTypes'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity({ synchronize: false })
export class ChoreDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  name: string

  // vector(1024) column managed by migration. Use pgvector.toSql() for writes, raw SQL for queries.
  @Column({ nullable: true, select: false })
  embedding: string

  @Column({ type: 'text', nullable: true })
  size: ChoreDifficulty | null

  @Column({ type: 'text', nullable: true })
  discordVoteMessageId: string | null

  @Column({ type: 'timestamp', nullable: true })
  votePostedAt: Date | null

  @Column({ type: 'uuid', nullable: true })
  aliasOfId: string | null

  @ManyToOne(() => ChoreDefinition, (def) => def.aliases, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'aliasOfId' })
  aliasOf: ChoreDefinition | null

  @OneToMany(() => ChoreDefinition, (def) => def.aliasOf)
  aliases: ChoreDefinition[]

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date

  toApi() {
    const VOTE_WINDOW_MS = 24 * 60 * 60 * 1000
    const voteExpiresAt = this.discordVoteMessageId !== null && this.votePostedAt !== null
      ? new Date(this.votePostedAt.getTime() + VOTE_WINDOW_MS).toISOString()
      : null
    return {
      id: this.id,
      name: this.name,
      size: this.size,
      aliasOfId: this.aliasOfId ?? null,
      voteExpiresAt,
      createdAt: this.createdAt,
    }
  }
}
