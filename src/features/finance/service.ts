import "server-only";
import { PaymentStatus } from "@/generated/prisma/client";
import { organisationDate } from "@/lib/clock";
import { prisma } from "@/lib/prisma";
import { isOverdue, outstandingBalance } from "@/features/finance/rules";

export async function balanceForAssignment(feeAssignmentId: string) {
  const [assignment, payments, adjustments] = await Promise.all([
    prisma.feeAssignment.findUniqueOrThrow({ where: { id: feeAssignmentId } }),
    prisma.payment.aggregate({ where: { feeAssignmentId, status: PaymentStatus.ACTIVE }, _sum: { amountMinor: true } }),
    prisma.feeAdjustment.aggregate({ where: { feeAssignmentId }, _sum: { amountMinor: true } }),
  ]);
  return {
    assignment,
    balanceMinor: outstandingBalance(assignment.amountMinor, adjustments._sum.amountMinor ?? 0, payments._sum.amountMinor ?? 0),
  };
}

export async function overdueAccounts() {
  const assignments = await prisma.feeAssignment.findMany({ include: { student: true } });
  const values = await Promise.all(assignments.map(async (assignment) => {
    const { balanceMinor } = await balanceForAssignment(assignment.id);
    return { assignment, balanceMinor };
  }));
  const today = organisationDate();
  return values.filter(({ assignment, balanceMinor }) => isOverdue(balanceMinor, assignment.dueDate, today)).map(({ assignment, balanceMinor }) => {
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - assignment.dueDate.getTime()) / 86_400_000));
    return { student: assignment.student, dueDate: assignment.dueDate, balanceMinor, daysOverdue };
  }).sort((a, b) => b.daysOverdue - a.daysOverdue);
}
