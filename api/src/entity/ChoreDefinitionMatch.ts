import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'
import { Chore } from './Chore'
import { ChoreDefinition } from './ChoreDefinition'

@Entity({ synchronize: false })
export class ChoreDefinitionMatch {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @OneToOne(() => Chore, { onDelete: 'CASCADE' })
  @JoinColumn()
  chore: Relation<Chore>

  @ManyToOne(() => ChoreDefinition, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn()
  choreDefinition: Relation<ChoreDefinition> | null

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date
}
