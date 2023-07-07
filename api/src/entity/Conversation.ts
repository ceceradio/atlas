'use server'
import { Message } from '@/entity/Message'
import { Organization } from '@/entity/Organization'
import { User } from '@/entity/User'
import { IConversation } from '@/interface/Conversation'
import { IMessage } from '@/interface/Message'
import { IOrganization } from '@/interface/Organization'
import { IUser } from '@/interface/User'
import {
  Column,
  CreateDateColumn,
  DataSource,
  Entity,
  Equal,
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
  creator: IUser

  @ManyToOne(() => Organization, (organization) => organization.conversations)
  @JoinColumn()
  organization: IOrganization

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Relation<IMessage>[]

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

  static async listByOrganization(
    dataSource: DataSource,
    organization: Organization,
  ) {
    return dataSource.getRepository(Conversation).find({
      where: { organization: Equal(organization) },
      order: {
        created: 'DESC',
      },
    })
  }

  static async listByCreator(dataSource: DataSource, creator: User) {
    return dataSource.getRepository(Conversation).find({
      where: { creator: Equal(creator.uuid) },
      order: {
        created: 'DESC',
      },
    })
  }

  static async get(
    dataSource: DataSource,
    uuid: string,
  ): Promise<IConversation | undefined> {
    const [conversation] = await dataSource.getRepository(Conversation).find({
      where: { uuid },
      order: {
        created: 'ASC',
      },
      relations: {
        messages: true,
      },
    })
    return conversation
  }
}
