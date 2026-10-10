import { EnrolmentStatus } from "@/generated/prisma/client";
import { AppError } from "@/lib/http";

const transitions: Record<EnrolmentStatus, EnrolmentStatus[]> = {
  ENROLLED: [EnrolmentStatus.DEFERRED, EnrolmentStatus.WITHDRAWN, EnrolmentStatus.COMPLETED],
  DEFERRED: [EnrolmentStatus.ENROLLED, EnrolmentStatus.WITHDRAWN],
  WITHDRAWN: [],
  COMPLETED: [],
};

export function studentCode(academicYear: string, sequence: number) {
  const match = /^(\d{4})\/\d{2}$/.exec(academicYear);
  if (!match) throw new AppError("VALIDATION_ERROR", 422, "Academic year must use YYYY/YY format.");
  return `SMS-${match[1]}-${String(sequence).padStart(4, "0")}`;
}

export function assertStatusTransition(from: EnrolmentStatus, to: EnrolmentStatus, reason?: string) {
  if (!transitions[from].includes(to)) throw new AppError("CONFLICT", 409, `Cannot change status from ${from} to ${to}.`);
  if ((to === EnrolmentStatus.DEFERRED || to === EnrolmentStatus.WITHDRAWN) && !reason?.trim()) {
    throw new AppError("VALIDATION_ERROR", 422, "A reason is required for deferred and withdrawn statuses.");
  }
  if (reason && reason.length > 500) throw new AppError("VALIDATION_ERROR", 422, "Status reason must be 500 characters or fewer.");
}
