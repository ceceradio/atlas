import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Organization } from './Organization'

@Entity()
export class Depository {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => Organization, (organization) => organization.depositories)
  organization: Organization
}
