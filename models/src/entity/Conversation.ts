import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Message } from './Message'
import { Organization } from './Organization'
import { User } from './User'

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => User, (user) => user.createdConversations)
  creator: User

  @ManyToOne(() => Organization, (organization) => organization.conversations)
  organization: Organization

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[]
}
