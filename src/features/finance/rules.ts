import { AppError } from "@/lib/http";

export function outstandingBalance(assignedMinor: number, adjustmentMinor: number, paymentMinor: number) {
  return assignedMinor + adjustmentMinor - paymentMinor;
}

export function isOverdue(balanceMinor: number, dueDate: Date, today = new Date()) {
  return balanceMinor > 0 && today.getTime() > new Date(dueDate).getTime();
}

export function assertPaymentAllowed(amountMinor: number, outstandingMinor: number, receivedOn: Date, today = new Date()) {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) throw new AppError("VALIDATION_ERROR", 422, "Payment amount must be positive.");
  if (amountMinor > outstandingMinor) throw new AppError("CONFLICT", 409, "Payment cannot exceed the outstanding balance.");
  if (receivedOn.getTime() > today.getTime()) throw new AppError("VALIDATION_ERROR", 422, "Payment date cannot be in the future.");
}
