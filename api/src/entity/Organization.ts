'use server'
import { Conversation } from '@/entity/Conversation'
import { Depository } from '@/entity/Depository'
import { ServicingKey } from '@/entity/ServicingKey'
import { User } from '@/entity/User'
import { IOrganization } from '@/interface/Organization'
import {
  CreateDateColumn,
  DataSource,
  Entity,
  EntityManager,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'

@Entity()
export class Organization implements IOrganization {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @OneToMany(() => ServicingKey, (servicingKey) => servicingKey.organization)
  servicingKeys: Promise<Relation<ServicingKey>[]>

  @OneToMany(() => User, (user) => user.organization)
  users: Promise<Relation<User>[]>

  @OneToMany(() => Depository, (depository) => depository.organization)
  depositories: Promise<Relation<Depository>[]>

  @OneToMany(() => Conversation, (conversation) => conversation.organization)
  conversations: Relation<Conversation>[]

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created: Date

  static async create(AppDataSource: DataSource | EntityManager) {
    const organization = AppDataSource.getRepository(Organization).create()
    return await AppDataSource.getRepository(Organization).save(organization)
  }

  static async get(dataSource: DataSource | EntityManager, uuid: string) {
    const [organization] = await dataSource.getRepository(Organization).find({
      where: { uuid },
      order: {
        created: 'ASC',
      },
    })
    return organization
  }

  static async list(dataSource: DataSource | EntityManager) {
    return dataSource.getRepository(Organization).find({
      order: {
        created: 'ASC',
      },
    })
  }
}
