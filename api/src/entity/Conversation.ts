'use server'
import {
  CreateDateColumn,
  DataSource,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'
import { Message } from './Message'
import { Organization } from './Organization'
import { User } from './User'

@Entity()
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => User, (user) => user.createdConversations)
  @JoinColumn()
  creator: User

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

  static async create(dataSource: DataSource, creator: User) {
    const conversation = dataSource.getRepository(Conversation).create({
      creator,
      organization: creator.organization,
    })
    return await dataSource.getRepository(Conversation).save(conversation)
  }

  static async get(dataSource: DataSource, uuid: string) {
    const [conversation] = await dataSource.getRepository(Conversation).find({
      where: { uuid },
      order: {
        created: 'ASC',
      },
      relations: {
        messages: true,
      },
    })
    if (!conversation) throw new Error()
    return conversation
  }
}
