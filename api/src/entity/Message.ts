'use server'
import { ChatCompletionRequestMessage } from 'openai'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Conversation } from './Conversation'
import { User } from './User'

@Entity()
export class Message {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => User, (user) => user.authoredMessages)
  @JoinColumn()
  author: User | null

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn()
  conversation: Conversation

  @Column()
  content: string

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date

  toOpenAI(): ChatCompletionRequestMessage {
    return {
      role: this.author ? 'user' : 'assistant',
      name: this.author ? 'Residents' : 'Atlas',
      content: this.content,
    }
  }
}
