import "server-only";
import { Prisma } from "@/generated/prisma/client";

export function auditData(
  actorId: string | undefined,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue,
) {
  return { actorId, action, entityType, entityId, metadata };
}
