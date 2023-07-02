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
import { Conversation } from './Conversation'
import { Message } from './Message'
import { Organization } from './Organization'

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => Organization, (organization) => organization.users)
  @JoinColumn()
  organization: Organization

  @OneToMany(() => Conversation, (conversation) => conversation.creator)
  createdConversations: Relation<Conversation>[]

  @OneToMany(() => Message, (message) => message.author)
  authoredMessages: Relation<Message>[]

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date

  static async create(AppDataSource: DataSource, organization: Organization) {
    const user = AppDataSource.getRepository(User).create({
      organization,
    })
    return await AppDataSource.getRepository(User).save(user)
  }
}
