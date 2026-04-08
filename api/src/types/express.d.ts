import { EntityManager } from 'typeorm'

declare global {
  namespace Express {
    interface Locals {
      db: EntityManager
    }
  }
}
