'use server'
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Organization } from './Organization'
import { Servicer } from './Servicer'

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
