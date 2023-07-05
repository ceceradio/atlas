'use server'
import { AuthProfile } from '@/entity/AuthProfile'
import { Conversation } from '@/entity/Conversation'
import { Message } from '@/entity/Message'
import { Organization } from '@/entity/Organization'
import {
  Column,
  CreateDateColumn,
  DataSource,
  Entity,
  Equal,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'

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

  @OneToMany(() => AuthProfile, (authProfile) => authProfile.user)
  authProfiles: Relation<AuthProfile>[]

  @Column()
  @Index()
  inviteCode: string

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date

  static async create(dataSource: DataSource, organization: Organization) {
    const user = dataSource.getRepository(User).create({
      organization,
    })
    user.inviteCode = this.generateInviteCode()
    return await dataSource.getRepository(User).save(user)
  }
  static generateInviteCode(): string {
    const alphanumeric =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    const length = 8

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * alphanumeric.length)
      result += alphanumeric.charAt(randomIndex)
    }

    return result
  }
  static async getByInvite(
    dataSource: DataSource,
    inviteCode: string,
  ): Promise<User> {
    const [user] = await dataSource.getRepository(User).find({
      where: {
        inviteCode: Equal(inviteCode),
      },
    })
    return user
  }

  static async list(dataSource: DataSource) {
    return dataSource.getRepository(User).find({
      order: {
        created: 'ASC',
      },
      relations: {
        authProfiles: true,
      },
    })
  }
}
