'use server'
import { Conversation } from '@/entity/Conversation'
import { User } from '@/entity/User'
import {
  AuthorTypes,
  ChatCompletionRequestMessageWithUuid,
  IMessage,
} from '@/interface/Message'
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
  author: User | null

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn()
  conversation: Conversation

  @Column()
  content: string

  @Column()
  authorType: AuthorTypes

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date

  toOpenAI(): ChatCompletionRequestMessageWithUuid {
    const names = {
      system: 'System',
      user: 'Residents',
      assistant: 'Atlas',
      function: 'Function',
    }
    return {
      uuid: this.uuid,
      role: this.authorType,
      name: names[this.authorType],
      content: this.content,
    }
  }

  static async create(
    AppDataSource: DataSource,
    conversation: Conversation,
    author: User | null,
    authorType: AuthorTypes,
    content: string,
  ) {
    const message = AppDataSource.getRepository(Message).create({
      conversation,
      author,
      authorType,
      content,
    })
    return await AppDataSource.getRepository(Message).save(message)
  }
}
