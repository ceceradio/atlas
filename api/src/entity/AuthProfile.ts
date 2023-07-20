'use server'
import { User } from '@/entity/User'
import { IAuthProfile } from '@/interface/AuthProfile'
import { IUser } from '@/interface/User'
import {
  Column,
  CreateDateColumn,
  DataSource,
  Entity,
  EntityManager,
  Equal,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AuthProviders } from './AuthProviders'

@Entity()
export class AuthProfile implements IAuthProfile {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => User, (user) => user.authProfiles)
  @JoinColumn()
  user: User

  @Column({
    type: 'enum',
    enum: AuthProviders,
    default: AuthProviders.AUTH0,
  })
  provider: AuthProviders

  @Column()
  @Index({ unique: true })
  providerId: string

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date

  static async create(
    dataSource: DataSource | EntityManager,
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
    dataSource: DataSource | EntityManager,
    provider: AuthProviders,
    providerId: string,
  ): Promise<IUser | undefined> {
    const [authProfile] = await dataSource.getRepository(AuthProfile).find({
      where: {
        provider: Equal(provider),
        providerId: Equal(providerId),
      },
      relations: {
        user: {
          organization: true,
        },
      },
    })

    if (!authProfile) return
    return authProfile.user
  }
}
