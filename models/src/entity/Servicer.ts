import { Entity, PrimaryGeneratedColumn, Column, OneToMany, Index } from "typeorm"
import { ServicerAuthMethod } from "./ServicerAuthMethod"

@Entity()
export class Servicer {

    @PrimaryGeneratedColumn("uuid")
    uuid: string

    @Index({ unique: true })
    @Column()
    email: string

    @OneToMany(() => ServicerAuthMethod, (authMethod) => authMethod.servicer)
    authMethods: ServicerAuthMethod

}
