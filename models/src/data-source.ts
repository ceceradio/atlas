import "reflect-metadata"
import { DataSource } from "typeorm"
import { Servicer } from "./entity/Servicer"
import { ServicerAuthMethod } from "./entity/ServicerAuthMethod"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "postgres",
    password: "postgres",
    database: "postgres",
    synchronize: true,
    logging: false,
    entities: [Servicer,ServicerAuthMethod],
    migrations: [],
    subscribers: [],
})

