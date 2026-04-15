import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export const AuditAction = {
  CHORE_UPDATED: 'CHORE_UPDATED',
  CHORE_MESSAGE_REPROCESSED: 'CHORE_MESSAGE_REPROCESSED',
  CHORE_MESSAGES_BULK_QUEUED: 'CHORE_MESSAGES_BULK_QUEUED',
  CHORE_DEFINITION_CREATED: 'CHORE_DEFINITION_CREATED',
  CHORE_DEFINITION_UPDATED: 'CHORE_DEFINITION_UPDATED',
  CHORE_DEFINITION_DELETED: 'CHORE_DEFINITION_DELETED',
  ORGANIZATION_SETTINGS_UPDATED: 'ORGANIZATION_SETTINGS_UPDATED',
  RSVP_COMPLETED: 'RSVP_COMPLETED',
} as const

export type AuditActionType = (typeof AuditAction)[keyof typeof AuditAction]

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date

  @Column({ type: 'uuid', nullable: true })
  userId: string | null

  @Column({ type: 'uuid' })
  organizationId: string

  @Column()
  action: string

  @Column()
  entityType: string

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null

  toApi() {
    return {
      id: this.id,
      createdAt: this.createdAt,
      userId: this.userId,
      organizationId: this.organizationId,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      before: this.before,
      after: this.after,
      metadata: this.metadata,
    }
  }
}
