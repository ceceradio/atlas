import { Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Conversation } from './Conversation'
import { Depository } from './Depository'
import { ServicingKey } from './ServicingKey'
import { User } from './User'

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @OneToMany(() => ServicingKey, (servicingKey) => servicingKey.organization)
  servicingKeys: ServicingKey

  @OneToMany(() => User, (user) => user.organization)
  users: User[]

  @OneToMany(() => Depository, (depository) => depository.organization)
  depositories: Depository[]

  @OneToMany(() => Conversation, (conversation) => conversation.organization)
  conversations: Conversation[]
}
