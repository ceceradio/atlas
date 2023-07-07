'use server'
import { Servicer } from '@/entity/Servicer'
import { IServicer } from '@/interface/Servicer'
import { IServicerAuthProfile } from '@/interface/ServicerAuthProfile'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { AuthProviders } from './AuthProfile'

@Entity()
export class ServicerAuthProfile implements IServicerAuthProfile {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @Column()
  provider: AuthProviders

  @Column()
  @Index({ unique: true })
  providerId: string

  @ManyToOne(() => Servicer, (servicer) => servicer.authProfiles)
  @JoinColumn()
  servicer: IServicer

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date
}
