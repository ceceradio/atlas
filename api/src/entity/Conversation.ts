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

  static async create(AppDataSource: DataSource, creator: User) {
    const conversation = AppDataSource.getRepository(Conversation).create({
      creator,
      organization: creator.organization,
    })
    return await AppDataSource.getRepository(Conversation).save(conversation)
  }
}
