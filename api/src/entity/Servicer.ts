'use server'
import { ServicerAuthMethod } from '@/entity/ServicerAuthMethod'
import { ServicingKey } from '@/entity/ServicingKey'
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
export class Servicer {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @Index({ unique: true })
  @Column()
  email: string

  @OneToMany(() => ServicerAuthMethod, (authMethod) => authMethod.servicer)
  authMethods: Relation<ServicerAuthMethod>[]

  @OneToMany(() => ServicingKey, (servicingKey) => servicingKey.servicer)
  servicingKeys: Relation<ServicingKey>[]

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date
}
