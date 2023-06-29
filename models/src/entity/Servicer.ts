import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { ServicerAuthMethod } from './ServicerAuthMethod'
import { ServicingKey } from './ServicingKey'

@Entity()
export class Servicer {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @Index({ unique: true })
  @Column()
  email: string

  @OneToMany(() => ServicerAuthMethod, (authMethod) => authMethod.servicer)
  authMethods: ServicerAuthMethod

  @OneToMany(() => ServicingKey, (servicingKey) => servicingKey.servicer)
  servicingKeys: ServicingKey
}
