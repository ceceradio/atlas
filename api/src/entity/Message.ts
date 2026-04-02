'use server'
import {
  AtlasRoleEnums,
  IAtlasAssistantMessage,
  IAtlasMessage,
  IAtlasUserMessage,
} from '@/atlas/IAtlas'
import { Conversation } from '@/entity/Conversation'
import { User } from '@/entity/User'
import { IMessage } from '@/interface/Message'

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
    enum: AtlasRoleEnums,
    default: 'system',
  })
  authorType: IAtlasMessage['role']

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date

  toAtlasMessage(): IAtlasUserMessage | IAtlasAssistantMessage {
    if (this.authorType !== 'user' && this.authorType !== 'assistant') {
      throw new Error('Invalid author type')
    }
    const names: Record<IAtlasMessage['role'], string> = {
      system: 'System',
      user: this.author?.name || 'User',
      assistant: 'Atlas',
      tool_call: 'Function',
      tool_response: 'FunctionResponse',
    }
    return {
      name: names[this.authorType],
      content: this.content,
      time: this.created.getTime(),
      role: this.authorType as 'assistant' | 'user',
    }
  }

  static async create(
    dataSource: DataSource | EntityManager,
    conversation: Conversation,
    author: User | null,
    authorType: IAtlasMessage['role'],
    content: string,
    created?: Date,
  ) {
    const message = dataSource.getRepository(Message).create({
      conversation,
      author,
      authorType,
      content,
      created,
    })
    return dataSource.getRepository(Message).save(message)
  }
}
