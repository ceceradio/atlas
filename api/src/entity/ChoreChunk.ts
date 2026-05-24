import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'
import { Chore } from './Chore'

@Entity({ synchronize: false })
export class ChoreChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Chore, (chore) => chore.chunks, { onDelete: 'CASCADE' })
  @JoinColumn()
  chore: Relation<Chore>

  @Column({ select: false })
  embedding: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date
}
