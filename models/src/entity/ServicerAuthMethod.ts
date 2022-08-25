import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from "typeorm"
import { Servicer } from "./Servicer"

@Entity()
export class ServicerAuthMethod {

    @PrimaryGeneratedColumn("uuid")
    uuid: string

    @Column()
    name: string

    @Column()
    data: string

    @ManyToOne(() => Servicer, (servicer) => servicer.authMethods)
    servicer: Servicer

}
