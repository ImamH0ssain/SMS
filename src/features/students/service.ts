import "server-only";
import { EnrolmentStatus, Prisma, UserRole } from "@/generated/prisma/client";
import { auditData } from "@/lib/audit";
import { AppError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { assertStatusTransition, studentCode } from "@/features/students/rules";

export type EnrolStudentInput = {
  fullName: string;
  email: string;
  dateOfBirth: Date;
  programmeId: string;
  academicYear: string;
  confirmPossibleDuplicate?: boolean;
};

export async function enrolStudent(input: EnrolStudentInput, actorId: string) {
  const email = input.email.trim().toLowerCase();
  const name = input.fullName.trim();
  if (!name || !email || input.dateOfBirth >= new Date()) throw new AppError("VALIDATION_ERROR", 422, "Enter a name, valid email, and past date of birth.");
  const start = Number(input.academicYear.slice(0, 4));
  if (!/^\d{4}\/\d{2}$/.test(input.academicYear) || !Number.isInteger(start)) throw new AppError("VALIDATION_ERROR", 422, "Academic year must use YYYY/YY format.");
  return prisma.$transaction(async (tx) => {
    const [existingEmail, duplicate, rule] = await Promise.all([
      tx.student.findUnique({ where: { email } }),
      tx.student.findFirst({ where: { fullName: { equals: name, mode: "insensitive" }, dateOfBirth: input.dateOfBirth } }),
      tx.programmeFeeRule.findUnique({ where: { programmeId_academicYear: { programmeId: input.programmeId, academicYear: input.academicYear } } }),
    ]);
    if (existingEmail) throw new AppError("CONFLICT", 409, "A student already uses this email address.");
    if (duplicate && !input.confirmPossibleDuplicate) throw new AppError("POSSIBLE_DUPLICATE", 409, "A student with the same name and date of birth exists. Confirm to continue.");
    if (!rule) throw new AppError("CONFLICT", 409, "No fee rule exists for this programme and academic year. Configure one before enrolling.");
    const counters = await tx.$queryRaw<{ lastIssued: number }[]>(Prisma.sql`
      INSERT INTO "StudentIdCounter" ("academicYearStart", "lastIssued") VALUES (${start}, 1)
      ON CONFLICT ("academicYearStart") DO UPDATE SET "lastIssued" = "StudentIdCounter"."lastIssued" + 1
      RETURNING "lastIssued"
    `);
    const code = studentCode(input.academicYear, counters[0].lastIssued);
    const student = await tx.student.create({ data: { studentCode: code, fullName: name, email, dateOfBirth: input.dateOfBirth, programmeId: input.programmeId, academicYear: input.academicYear } });
    await tx.user.create({ data: { name, role: UserRole.STUDENT, studentId: student.id } });
    await tx.feeAssignment.create({ data: { studentId: student.id, amountMinor: rule.amountMinor, dueDate: rule.dueDate, academicYear: input.academicYear } });
    await tx.auditEvent.create({ data: auditData(actorId, "STUDENT_ENROLLED", "Student", student.id, { studentCode: code }) });
    return student;
  });
}

export type UpdateStudentInput = {
  studentId: string;
  fullName: string;
  email: string;
  programmeId: string;
  academicYear: string;
  status: EnrolmentStatus;
  statusReason?: string;
};

export async function updateStudent(input: UpdateStudentInput, actorId: string) {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: input.studentId } });
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const reason = input.statusReason?.trim() || undefined;
  if (!fullName || !email) throw new AppError("VALIDATION_ERROR", 422, "A name and email are required.");
  if (!/^\d{4}\/\d{2}$/.test(input.academicYear)) throw new AppError("VALIDATION_ERROR", 422, "Academic year must use YYYY/YY format.");
  if (input.status !== student.status) assertStatusTransition(student.status, input.status, reason);
  if ((input.status === EnrolmentStatus.DEFERRED || input.status === EnrolmentStatus.WITHDRAWN) && !reason) throw new AppError("VALIDATION_ERROR", 422, "A reason is required for deferred and withdrawn students.");
  if (reason && reason.length > 500) throw new AppError("VALIDATION_ERROR", 422, "Status reason must be 500 characters or fewer.");
  const changedProgramme = input.programmeId !== student.programmeId || input.academicYear !== student.academicYear;
  if (!changedProgramme) {
    return prisma.$transaction(async (tx) => {
      const updated = await tx.student.update({ where: { id: student.id }, data: { fullName, email, status: input.status, statusReason: reason } });
      await tx.user.update({ where: { studentId: student.id }, data: { name: fullName } });
      await tx.auditEvent.create({ data: auditData(actorId, "STUDENT_UPDATED", "Student", student.id, { from: student.status, to: input.status, reason }) });
      return updated;
    });
  }
  const [payments, adjustments, submissions, results, rule] = await Promise.all([
    prisma.payment.count({ where: { feeAssignment: { studentId: student.id } } }),
    prisma.feeAdjustment.count({ where: { feeAssignment: { studentId: student.id } } }),
    prisma.submission.count({ where: { studentId: student.id } }),
    prisma.result.count({ where: { studentId: student.id } }),
    prisma.programmeFeeRule.findUnique({ where: { programmeId_academicYear: { programmeId: input.programmeId, academicYear: input.academicYear } } }),
  ]);
  if (payments || adjustments || submissions || results) throw new AppError("CONFLICT", 409, "Programme/year cannot change after finance or academic activity exists.");
  if (!rule) throw new AppError("CONFLICT", 409, "Add a fee rule before changing programme or academic year.");
  return prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({ where: { id: student.id }, data: { fullName, email, programmeId: input.programmeId, academicYear: input.academicYear, status: input.status, statusReason: reason } });
    await tx.user.update({ where: { studentId: student.id }, data: { name: fullName } });
    await tx.feeAssignment.delete({ where: { studentId: student.id } });
    await tx.feeAssignment.create({ data: { studentId: student.id, amountMinor: rule.amountMinor, dueDate: rule.dueDate, academicYear: input.academicYear } });
    await tx.auditEvent.create({ data: auditData(actorId, "STUDENT_UPDATED", "Student", student.id, { from: student.status, to: input.status, reason, resnapshottedFee: true }) });
    return updated;
  });
}
