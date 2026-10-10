import "server-only";
import { ResultStatus } from "@/generated/prisma/client";
import { gradingGrid } from "@/features/assessments/service";
import { auditData } from "@/lib/audit";
import { organisationDate } from "@/lib/clock";
import { AppError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { isOverdue, outstandingBalance } from "@/features/finance/rules";
import { assertOverduePublicationConfirmation, assertResultTransition, classifyGrade } from "@/features/results/rules";

async function studentIsOverdue(studentId: string) {
  const assignment = await prisma.feeAssignment.findUnique({
    where: { studentId },
    include: {
      payments: { where: { status: "ACTIVE" }, select: { amountMinor: true } },
      adjustments: { select: { amountMinor: true } },
    },
  });
  if (!assignment) return false;
  const activePayments = assignment.payments.reduce((total, payment) => total + payment.amountMinor, 0);
  const adjustments = assignment.adjustments.reduce((total, adjustment) => total + adjustment.amountMinor, 0);
  return isOverdue(outstandingBalance(assignment.amountMinor, adjustments, activePayments), assignment.dueDate, organisationDate());
}

export async function saveResult(input: { studentId: string; assessmentId: string; grade: number; status: ResultStatus; withheldReason?: string; version?: number; overrideOverdue?: boolean }, actorId: string) {
  classifyGrade(input.grade);
  const grid = await gradingGrid(input.assessmentId);
  if (!grid.rows.some((row) => row.student.id === input.studentId)) throw new AppError("NOT_FOUND", 404, "Student is not gradeable for this assessment.");
  assertOverduePublicationConfirmation(await studentIsOverdue(input.studentId), input.status, input.overrideOverdue);
  const existing = await prisma.result.findUnique({ where: { studentId_assessmentId: { studentId: input.studentId, assessmentId: input.assessmentId } } });
  if (!existing) {
    if (input.status === ResultStatus.WITHHELD && !input.withheldReason?.trim()) throw new AppError("VALIDATION_ERROR", 422, "A reason is required when withholding a result.");
    return prisma.$transaction(async (tx) => {
      const result = await tx.result.create({ data: { studentId: input.studentId, assessmentId: input.assessmentId, grade: input.grade, status: input.status, withheldReason: input.status === ResultStatus.WITHHELD ? input.withheldReason?.trim() : null, publishedAt: input.status === ResultStatus.PUBLISHED ? new Date() : null, publishedById: input.status === ResultStatus.PUBLISHED ? actorId : null } });
      await tx.auditEvent.create({ data: auditData(actorId, "RESULT_CREATED", "Result", result.id, { status: input.status, overrideOverdue: input.status === ResultStatus.PUBLISHED && Boolean(input.overrideOverdue) }) });
      return result;
    });
  }
  if (input.version !== existing.version) throw new AppError("CONFLICT", 409, "This result was updated by another user. Reload and try again.");
  if (existing.status === ResultStatus.PUBLISHED && input.status !== ResultStatus.WITHHELD) throw new AppError("CONFLICT", 409, "Withhold a published result before editing it.");
  if (existing.status !== input.status) assertResultTransition(existing.status, input.status, input.withheldReason);
  return prisma.$transaction(async (tx) => {
    const changed = await tx.result.updateMany({ where: { id: existing.id, version: input.version }, data: { grade: input.grade, status: input.status, withheldReason: input.status === ResultStatus.WITHHELD ? input.withheldReason?.trim() : null, publishedAt: input.status === ResultStatus.PUBLISHED ? new Date() : existing.publishedAt, publishedById: input.status === ResultStatus.PUBLISHED ? actorId : existing.publishedById, version: { increment: 1 } } });
    if (changed.count !== 1) throw new AppError("CONFLICT", 409, "This result was updated by another user. Reload and try again.");
    const result = await tx.result.findUniqueOrThrow({ where: { id: existing.id } });
    await tx.auditEvent.create({ data: auditData(actorId, "RESULT_UPDATED", "Result", result.id, { from: existing.status, to: input.status, overrideOverdue: input.status === ResultStatus.PUBLISHED && Boolean(input.overrideOverdue) }) });
    return result;
  });
}
