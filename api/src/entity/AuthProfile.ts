'use server'
import { AtlasError } from '@/apps/errors'
import { User } from '@/entity/User'
import {
  Column,
  CreateDateColumn,
  DataSource,
  Entity,
  Equal,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

export type AuthProviders = 'auth0'

@Entity()
export class AuthProfile {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => User, (user) => user.authProfiles)
  @JoinColumn()
  user: User

  @Column()
  provider: AuthProviders

  @Column()
  providerId: string

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date

  static async create(
    dataSource: DataSource,
    user: User,
    provider: AuthProviders,
    providerId: string,
  ) {
    const profile = dataSource.getRepository(AuthProfile).create({
      user,
      provider,
      providerId,
    })
    return await dataSource.getRepository(AuthProfile).save(profile)
  }

  static async getUser(
    dataSource: DataSource,
    provider: AuthProviders,
    providerId: string,
  ) {
    const [authProfile] = await dataSource.getRepository(AuthProfile).find({
      where: {
        provider: Equal(provider),
        providerId: Equal(providerId),
      },
      relations: {
        user: true,
      },
    })
    if (!authProfile) throw new AtlasError()
    return authProfile.user
  }
}
