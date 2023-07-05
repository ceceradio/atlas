'use server'
import { AtlasError } from '@/apps/errors'
import { Conversation } from '@/entity/Conversation'
import { Depository } from '@/entity/Depository'
import { ServicingKey } from '@/entity/ServicingKey'
import { User } from '@/entity/User'
import {
  CreateDateColumn,
  DataSource,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'

@Entity()
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @OneToMany(() => ServicingKey, (servicingKey) => servicingKey.organization)
  servicingKeys: Relation<ServicingKey>[]

  @OneToMany(() => User, (user) => user.organization)
  users: Relation<User>[]

  @OneToMany(() => Depository, (depository) => depository.organization)
  depositories: Relation<Depository>[]

  @OneToMany(() => Conversation, (conversation) => conversation.organization)
  conversations: Relation<Conversation>[]

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date

  static async create(AppDataSource: DataSource) {
    const organization = AppDataSource.getRepository(Organization).create()
    return await AppDataSource.getRepository(Organization).save(organization)
  }

  static async get(dataSource: DataSource, uuid: string) {
    const [organization] = await dataSource.getRepository(Organization).find({
      where: { uuid },
      order: {
        created: 'ASC',
      },
    })
    if (!organization) throw new AtlasError()
    return organization
  }

  static async list(dataSource: DataSource) {
    return dataSource.getRepository(Organization).find({
      order: {
        created: 'ASC',
      },
    })
  }
}
