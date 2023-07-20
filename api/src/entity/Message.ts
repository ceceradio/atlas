'use server'
import { Conversation } from '@/entity/Conversation'
import { User } from '@/entity/User'
import {
  ChatCompletionRequestMessageWithUuid,
  IMessage,
} from '@/interface/Message'
import { ChatCompletionRequestMessageRoleEnum } from 'openai'
import {
  Column,
  CreateDateColumn,
  DataSource,
  Entity,
  EntityManager,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
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
  conversation: Relation<Conversation>

  @Column()
  content: string

  @Column({
    type: 'enum',
    enum: ChatCompletionRequestMessageRoleEnum,
    default: ChatCompletionRequestMessageRoleEnum.System,
  })
  authorType: ChatCompletionRequestMessageRoleEnum

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
    dataSource: DataSource | EntityManager,
    conversation: Conversation,
    author: User | null,
    authorType: ChatCompletionRequestMessageRoleEnum,
    content: string,
  ) {
    const message = dataSource.getRepository(Message).create({
      conversation,
      author,
      authorType,
      content,
    })
    return dataSource.getRepository(Message).save(message)
  }
}
