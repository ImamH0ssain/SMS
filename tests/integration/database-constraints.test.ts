import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { EnrolmentStatus, PrismaClient, ResultStatus, UserRole } from "@/generated/prisma/client";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function fixture() {
  const staff = await prisma.user.create({ data: { name: "Integration Staff", role: UserRole.REGISTRY_STAFF } });
  const programme = await prisma.programme.create({ data: { code: "INT-CS", name: "Integration Computing" } });
  const module = await prisma.module.create({ data: { code: "INT101", name: "Integration Module", programmeId: programme.id } });
  const student = await prisma.student.create({ data: { studentCode: "SMS-2026-9001", fullName: "Integration Student", email: "integration@example.test", dateOfBirth: new Date("2000-01-01"), programmeId: programme.id, academicYear: "2026/27", status: EnrolmentStatus.ENROLLED } });
  const assignment = await prisma.feeAssignment.create({ data: { studentId: student.id, amountMinor: 10000, dueDate: new Date("2026-10-01"), academicYear: "2026/27" } });
  const assessment = await prisma.assessment.create({ data: { title: "Integration assessment", moduleId: module.id, academicYear: "2026/27", deadline: new Date("2026-12-01T12:00:00Z"), createdById: staff.id } });
  return { staff, student, assignment, assessment };
}

beforeEach(async () => {
  await prisma.auditEvent.deleteMany();
  await prisma.result.deleteMany();
  await prisma.submissionRevision.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.feeAdjustment.deleteMany();
  await prisma.feeAssignment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.student.deleteMany();
  await prisma.module.deleteMany();
  await prisma.programme.deleteMany();
});

afterAll(async () => prisma.$disconnect());

describe("database constraints", () => {
  it("rejects zero payments, zero adjustments, and results outside 0–100", async () => {
    const { staff, student, assignment, assessment } = await fixture();
    await expect(prisma.payment.create({ data: { feeAssignmentId: assignment.id, amountMinor: 0, receivedOn: new Date("2026-09-01"), reference: "INT-ZERO" } })).rejects.toThrow();
    await expect(prisma.feeAdjustment.create({ data: { feeAssignmentId: assignment.id, amountMinor: 0, reason: "Invalid", createdById: staff.id } })).rejects.toThrow();
    await expect(prisma.result.create({ data: { studentId: student.id, assessmentId: assessment.id, grade: 101, status: ResultStatus.DRAFT } })).rejects.toThrow();
  });

  it("retains one immutable assignment and enforces one result per student-assessment", async () => {
    const { student, assignment, assessment } = await fixture();
    await prisma.result.create({ data: { studentId: student.id, assessmentId: assessment.id, grade: 70, status: ResultStatus.DRAFT } });
    await expect(prisma.result.create({ data: { studentId: student.id, assessmentId: assessment.id, grade: 69, status: ResultStatus.DRAFT } })).rejects.toThrow();
    expect(await prisma.feeAssignment.count({ where: { studentId: student.id } })).toBe(1);
    expect(assignment.amountMinor).toBe(10000);
  });
});
