import { db } from "./db";

export async function audit(userId: string | null, action: string, entity: string, entityId?: string, detail?: string) {
  try {
    await db.auditLog.create({ data: { userId, action, entity, entityId, detail } });
  } catch {
    // never let audit logging break the request
  }
}
