import { Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm'
import { Organization } from './Organization'
import { Servicer } from './Servicer'

@Entity()
export class ServicingKey {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @ManyToOne(() => Organization, (organization) => organization.users)
  organization: Organization

  @ManyToOne(() => Servicer, (servicer) => servicer.servicingKeys)
  servicer: Servicer
}
