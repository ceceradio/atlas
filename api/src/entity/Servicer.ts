'use server'
import { ServicerAuthProfile } from '@/entity/ServicerAuthProfile'
import { ServicingKey } from '@/entity/ServicingKey'
import { IServicer } from '@/interface/Servicer'
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'

@Entity()
export class Servicer implements IServicer {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @Index({ unique: true })
  @Column()
  email: string

  @OneToMany(() => ServicerAuthProfile, (authProfile) => authProfile.servicer)
  authProfiles: Promise<Relation<ServicerAuthProfile>[]>

  @OneToMany(() => ServicingKey, (servicingKey) => servicingKey.servicer)
  servicingKeys: Promise<Relation<ServicingKey>[]>

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date
}
