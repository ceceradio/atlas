'use server'
import { Servicer } from '@/entity/Servicer'
import { IServicerAuthProfile } from '@/interface/ServicerAuthProfile'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'
import { AuthProviders } from './AuthProviders'

@Entity()
export class ServicerAuthProfile implements IServicerAuthProfile {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @Column({
    type: 'enum',
    enum: AuthProviders,
    default: AuthProviders.AUTH0,
  })
  provider: AuthProviders

  @Column()
  @Index({ unique: true })
  providerId: string

  @ManyToOne(() => Servicer, (servicer) => servicer.authProfiles)
  @JoinColumn()
  servicer: Relation<Servicer>

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date
}
