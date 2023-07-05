'use server'
import { Organization } from '@/entity/Organization'
import { Servicer } from '@/entity/Servicer'
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity()
export class ServicingKey {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => Organization, (organization) => organization.users)
  @JoinColumn()
  organization: Organization

  @ManyToOne(() => Servicer, (servicer) => servicer.servicingKeys)
  @JoinColumn()
  servicer: Servicer

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date
}
