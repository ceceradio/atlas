'use server'
import { Organization } from '@/entity/Organization'
import { IDepository } from '@/interface/Depository'
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm'

@Entity()
export class Depository implements IDepository {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => Organization, (organization) => organization.depositories)
  @JoinColumn()
  organization: Relation<Organization>

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date
}
