'use server'
import { IAtlasMessage } from '@/atlas/IAtlas'
import { Message } from '@/entity/Message'
import { Organization } from '@/entity/Organization'
import { User } from '@/entity/User'
import { IAPIConversation, IConversation } from '@/interface/Conversation'
import {
  Column,
  CreateDateColumn,
  DataSource,
  Entity,
  EntityManager,
  Equal,
  FindOptionsRelations,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'

@Entity()
export class Conversation implements IConversation {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @Column({ default: 'New Conversation' })
  title: string

  @ManyToOne(() => User, (user) => user.createdConversations)
  @JoinColumn()
  creator: Relation<User>

  @ManyToOne(() => Organization, (organization) => organization.conversations)
  @JoinColumn()
  organization: Organization

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Relation<Message>[]

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date

  static async create(dataSource: DataSource | EntityManager, creator: User) {
    const conversation = dataSource.getRepository(Conversation).create({
      creator,
      organization: creator.organization,
    })
    return await dataSource.getRepository(Conversation).save(conversation)
  }

  static async listByOrganization(
    dataSource: DataSource | EntityManager,
    organization: Organization,
  ) {
    return dataSource.getRepository(Conversation).find({
      where: { organization: Equal(organization.uuid) },
      relations: { creator: true },
      order: {
        created: 'DESC',
      },
    })
  }

  static async listByCreator(
    dataSource: DataSource | EntityManager,
    creator: User,
  ) {
    return await dataSource.getRepository(Conversation).find({
      where: { creator: Equal(creator.uuid) },
      order: {
        created: 'DESC',
      },
    })
  }

  static async get(
    dataSource: DataSource | EntityManager,
    uuid: string,
    relations?: FindOptionsRelations<Conversation>,
  ): Promise<Conversation | null> {
    return dataSource.getRepository(Conversation).findOne({
      where: { uuid },
      order: {
        created: 'ASC',
      },
      relations: {
        ...relations,
        organization: true,
        messages: {
          author: true,
        },
      },
    })
  }
  toChatString(tail?: number) {
    if (!this.messages || this.messages.length <= 0)
      return '[conversation.messages missing. is the relation not loaded?]'
    return Conversation.toAtlasChatString(this.messages, tail)
  }

  static toAtlasChatString(messages: Message[], tail?: number) {
    return (
      messages
        // remove system messages
        .filter((message) => message.authorType !== 'system')
        // go to open AI format
        .map((message) => {
          return { ...message.toAtlasMessage(), message }
        })
        // create text strings for each message
        .map(({ role, content, name, message }) => {
          return `At ${message.created.toLocaleTimeString()}, ${
            role === 'assistant' ? 'an assistant' : `a ${role}`
          } name of ${name} said: ${content}`
        })
        .slice(-1 * (tail || 0))
        // join all messages by double new line
        .join('\n\n')
    )
  }

  static toChatString(messages: IAtlasMessage[]) {
    return (
      messages
        // create text strings for each message
        .map((message) => {
          if (message.role === 'tool_call' || message.role === 'tool_response')
            return ''
          const nameOf = 'name' in message ? ` name of ${message.name}` : ''
          return `At ${new Date(message.time).toLocaleTimeString()}, ${
            message.role === 'assistant' ? 'an assistant' : `a ${message.role}`
          }${nameOf} said: ${message.content as string}`
        })
        // join all messages by double new line
        .join('\n\n')
    )
  }
  toApi(): IAPIConversation {
    return {
      uuid: this.uuid,
      title: this.title,
      created: this.created,
      creator: this.creator,
      organization: this.organization,
      messages: this.messages.map((message) => message.toAtlasMessage()),
    }
  }
}
