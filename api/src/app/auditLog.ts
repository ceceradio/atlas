import { postgres } from '@/data-source'
import { AuditLog } from '@/entity/AuditLog'

export async function auditLog(
  userId: string | null,
  organizationId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  before?: unknown,
  after?: unknown,
  metadata?: unknown,
): Promise<void> {
  try {
    const entry = postgres.getRepository(AuditLog).create({
      userId,
      organizationId,
      action,
      entityType,
      entityId,
      before: before !== undefined ? (before as Record<string, unknown>) : null,
      after: after !== undefined ? (after as Record<string, unknown>) : null,
      metadata: metadata !== undefined ? (metadata as Record<string, unknown>) : null,
    })
    await postgres.getRepository(AuditLog).save(entry)
  } catch (err) {
    console.error('[auditLog] Failed to write audit log entry:', err)
  }
}
