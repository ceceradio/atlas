'use server'
import {
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'
import { Conversation } from './Conversation'
import { Depository } from './Depository'
import { ServicingKey } from './ServicingKey'
import { User } from './User'

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @OneToMany(() => ServicingKey, (servicingKey) => servicingKey.organization)
  servicingKeys: Relation<ServicingKey>[]

  @OneToMany(() => User, (user) => user.organization)
  users: Relation<User>[]

  @OneToMany(() => Depository, (depository) => depository.organization)
  depositories: Relation<Depository>[]

  @OneToMany(() => Conversation, (conversation) => conversation.organization)
  conversations: Relation<Conversation>[]

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date
}
