import { Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { Conversation } from './Conversation'
import { Message } from './Message'
import { Organization } from './Organization'

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => Organization, (organization) => organization.users)
  organization: Organization

  @OneToMany(() => Conversation, (conversation) => conversation.creator)
  createdConversations: Conversation[]

  @OneToMany(() => Message, (message) => message.author)
  authoredMessages: Message[]
}
