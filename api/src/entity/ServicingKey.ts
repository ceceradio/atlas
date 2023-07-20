'use server'
import { Organization } from '@/entity/Organization'
import { Servicer } from '@/entity/Servicer'
import { IServicingKey } from '@/interface/ServicingKey'
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'

@Entity()
export class ServicingKey implements IServicingKey {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => Organization, (organization) => organization.users)
  @JoinColumn()
  organization: Relation<Organization>

  @ManyToOne(() => Servicer, (servicer) => servicer.servicingKeys)
  @JoinColumn()
  servicer: Servicer

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created: Date
}
