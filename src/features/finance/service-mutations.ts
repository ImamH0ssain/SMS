import "server-only";
import { PaymentStatus, Prisma } from "@/generated/prisma/client";
import { auditData } from "@/lib/audit";
import { organisationDate } from "@/lib/clock";
import { AppError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertPaymentAllowed, outstandingBalance } from "@/features/finance/rules";

async function lockedBalance(tx: Prisma.TransactionClient, feeAssignmentId: string) {
  await tx.$queryRaw(Prisma.sql`SELECT 1 FROM "FeeAssignment" WHERE "id" = ${feeAssignmentId} FOR UPDATE`);
  const [assignment, payments, adjustments] = await Promise.all([
    tx.feeAssignment.findUniqueOrThrow({ where: { id: feeAssignmentId } }),
    tx.payment.aggregate({ where: { feeAssignmentId, status: PaymentStatus.ACTIVE }, _sum: { amountMinor: true } }),
    tx.feeAdjustment.aggregate({ where: { feeAssignmentId }, _sum: { amountMinor: true } }),
  ]);
  return { assignment, balanceMinor: outstandingBalance(assignment.amountMinor, adjustments._sum.amountMinor ?? 0, payments._sum.amountMinor ?? 0) };
}

export async function recordPayment(input: { studentId: string; amountMinor: number; receivedOn: Date; reference: string }, actorId: string) {
  const reference = input.reference.trim().toUpperCase();
  if (!reference) throw new AppError("VALIDATION_ERROR", 422, "A payment reference is required.");
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.feeAssignment.findUnique({ where: { studentId: input.studentId } });
    if (!assignment) throw new AppError("NOT_FOUND", 404, "Student finance record not found.");
    const { balanceMinor } = await lockedBalance(tx, assignment.id);
    assertPaymentAllowed(input.amountMinor, balanceMinor, input.receivedOn, organisationDate());
    try {
      const payment = await tx.payment.create({ data: { feeAssignmentId: assignment.id, amountMinor: input.amountMinor, receivedOn: input.receivedOn, reference } });
      await tx.auditEvent.create({ data: auditData(actorId, "PAYMENT_RECORDED", "Payment", payment.id, { amountMinor: input.amountMinor, reference }) });
      return payment;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("CONFLICT", 409, "This payment reference already exists.");
      throw error;
    }
  });
}

export async function voidPayment(paymentId: string, reason: string, actorId: string) {
  if (!reason.trim()) throw new AppError("VALIDATION_ERROR", 422, "A reason is required to void a payment.");
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError("NOT_FOUND", 404, "Payment not found.");
    if (payment.status === PaymentStatus.VOIDED) throw new AppError("CONFLICT", 409, "This payment is already voided.");
    await lockedBalance(tx, payment.feeAssignmentId);
    const voided = await tx.payment.update({ where: { id: paymentId }, data: { status: PaymentStatus.VOIDED, voidReason: reason.trim(), voidedAt: new Date(), voidedById: actorId } });
    await tx.auditEvent.create({ data: auditData(actorId, "PAYMENT_VOIDED", "Payment", paymentId, { reason: reason.trim() }) });
    return voided;
  });
}

export async function createAdjustment(input: { studentId: string; amountMinor: number; reason: string }, actorId: string) {
  const reason = input.reason.trim();
  if (!Number.isInteger(input.amountMinor) || input.amountMinor === 0) {
    throw new AppError("VALIDATION_ERROR", 422, "An adjustment must be a non-zero whole penny amount.");
  }
  if (!reason || reason.length > 500) {
    throw new AppError("VALIDATION_ERROR", 422, "An adjustment reason is required and must be 500 characters or fewer.");
  }
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.feeAssignment.findUnique({ where: { studentId: input.studentId } });
    if (!assignment) throw new AppError("NOT_FOUND", 404, "Student finance record not found.");
    const { balanceMinor } = await lockedBalance(tx, assignment.id);
    if (balanceMinor + input.amountMinor < 0) {
      throw new AppError("CONFLICT", 409, "This adjustment would make the outstanding balance negative.");
    }
    const adjustment = await tx.feeAdjustment.create({ data: { feeAssignmentId: assignment.id, amountMinor: input.amountMinor, reason, createdById: actorId } });
    await tx.auditEvent.create({ data: auditData(actorId, "FEE_ADJUSTMENT_CREATED", "FeeAdjustment", adjustment.id, { amountMinor: input.amountMinor, reason }) });
    return adjustment;
  });
}
