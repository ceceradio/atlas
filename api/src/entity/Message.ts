'use server'
import { Conversation } from '@/entity/Conversation'
import { User } from '@/entity/User'
import { ChatCompletionRequestMessage } from 'openai'
import {
  Column,
  CreateDateColumn,
  DataSource,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

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

  static async create(
    AppDataSource: DataSource,
    conversation: Conversation,
    author: User | null,
    content: string,
  ) {
    const message = AppDataSource.getRepository(Message).create({
      conversation,
      author,
      content,
    })
    return await AppDataSource.getRepository(Message).save(message)
  }
}
