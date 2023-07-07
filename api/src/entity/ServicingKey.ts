'use server'
import { Organization } from '@/entity/Organization'
import { Servicer } from '@/entity/Servicer'
import { IOrganization } from '@/interface/Organization'
import { IServicer } from '@/interface/Servicer'
import { IServicingKey } from '@/interface/ServicingKey'
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity()
export class ServicingKey implements IServicingKey {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => Organization, (organization) => organization.users)
  @JoinColumn()
  organization: IOrganization

  @ManyToOne(() => Servicer, (servicer) => servicer.servicingKeys)
  @JoinColumn()
  servicer: IServicer

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  created: Date
}
