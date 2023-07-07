'use server'
import { Conversation } from '@/entity/Conversation'
import { User } from '@/entity/User'
import { IConversation } from '@/interface/Conversation'
import { IMessage } from '@/interface/Message'
import { IUser } from '@/interface/User'
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
export class Message implements IMessage {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => User, (user) => user.authoredMessages)
  @JoinColumn()
  author: IUser

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn()
  conversation: IConversation

  @Column()
  content: string

  @Column()
  isAI: boolean

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date

  toOpenAI(): ChatCompletionRequestMessage & { uuid: string } {
    return {
      uuid: this.uuid,
      role: this.author ? 'user' : 'assistant',
      name: this.author ? 'Residents' : 'Atlas',
      content: this.content,
    }
  }

  static async create(
    AppDataSource: DataSource,
    conversation: Conversation,
    author: User,
    content: string,
    isAI: boolean,
  ) {
    const message = AppDataSource.getRepository(Message).create({
      conversation,
      author,
      content,
      isAI,
    })
    return await AppDataSource.getRepository(Message).save(message)
  }
}
