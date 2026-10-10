import { ResultStatus } from "@/generated/prisma/client";
import { AppError } from "@/lib/http";

export type Classification = "Fail" | "Pass" | "Merit" | "Distinction";

export function classifyGrade(grade: number): Classification {
  if (!Number.isInteger(grade) || grade < 0 || grade > 100) {
    throw new AppError("VALIDATION_ERROR", 422, "Grade must be a whole number from 0 to 100.");
  }
  if (grade < 40) return "Fail";
  if (grade < 60) return "Pass";
  if (grade < 70) return "Merit";
  return "Distinction";
}

export function assertResultTransition(from: ResultStatus, to: ResultStatus, reason?: string) {
  const valid =
    (from === ResultStatus.DRAFT && (to === ResultStatus.PUBLISHED || to === ResultStatus.WITHHELD)) ||
    (from === ResultStatus.WITHHELD && to === ResultStatus.PUBLISHED) ||
    (from === ResultStatus.PUBLISHED && to === ResultStatus.WITHHELD);
  if (!valid) throw new AppError("CONFLICT", 409, `Cannot move a ${from.toLowerCase()} result to ${to.toLowerCase()}.`);
  if (to === ResultStatus.WITHHELD && !reason?.trim()) {
    throw new AppError("VALIDATION_ERROR", 422, "A reason is required when withholding a result.");
  }
}

export function assertOverduePublicationConfirmation(isStudentOverdue: boolean, nextStatus: ResultStatus, overrideOverdue?: boolean) {
  if (nextStatus === ResultStatus.PUBLISHED && isStudentOverdue && !overrideOverdue) {
    throw new AppError("CONFLICT", 409, "This student has overdue fees. Confirm the publication override to continue.");
  }
}
