'use server'
import { Organization } from '@/entity/Organization'
import { IDepository } from '@/interface/Depository'
import { IOrganization } from '@/interface/Organization'
import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'

@Entity()
export class Depository implements IDepository {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => Organization, (organization) => organization.depositories)
  @JoinColumn()
  organization: IOrganization

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public created: Date
}
