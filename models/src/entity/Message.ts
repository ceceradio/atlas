import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Conversation } from './Conversation'
import { User } from './User'

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => User, (user) => user.authoredMessages)
  author: User | null

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  conversation: Conversation

  @Column()
  content: string
}
