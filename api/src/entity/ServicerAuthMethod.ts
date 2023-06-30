'use server'
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Servicer } from './Servicer'

@Entity()
export class ServicerAuthMethod {
  @PrimaryGeneratedColumn('uuid')
  uuid: string

  @Column()
  name: string

  @Column()
  data: string

  @ManyToOne(() => Servicer, (servicer) => servicer.authMethods)
  @JoinColumn()
  servicer: Servicer

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  public createdAt: Date
}
