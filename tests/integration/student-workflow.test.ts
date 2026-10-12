import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole } from "@/generated/prisma/client";
import { enrolStudent, updateStudent } from "@/features/students/service";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function catalogue() {
  const staff = await prisma.user.create({ data: { name: "Student Workflow Staff", role: UserRole.REGISTRY_STAFF } });
  const first = await prisma.programme.create({ data: { code: "WF-ONE", name: "Workflow One" } });
  const second = await prisma.programme.create({ data: { code: "WF-TWO", name: "Workflow Two" } });
  await prisma.programmeFeeRule.createMany({
    data: [
      { programmeId: first.id, academicYear: "2026/27", amountMinor: 900000, dueDate: new Date("2026-10-01") },
      { programmeId: second.id, academicYear: "2027/28", amountMinor: 950000, dueDate: new Date("2027-10-01") },
    ],
  });
  return { first, second, staff };
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
  await prisma.programmeFeeRule.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.studentIdCounter.deleteMany();
});

afterAll(async () => prisma.$disconnect());

describe("student enrolment and fee snapshots", () => {
  it("atomically creates the student, linked user, fee snapshot, and audit event", async () => {
    const { first, staff } = await catalogue();
    const student = await enrolStudent({
      fullName: "Atomic Student",
      email: "ATOMIC@EXAMPLE.TEST ",
      dateOfBirth: new Date("2001-05-05"),
      programmeId: first.id,
      academicYear: "2026/27",
    }, staff.id);

    expect(student.studentCode).toBe("SMS-2026-0001");
    expect(student.email).toBe("atomic@example.test");
    expect(await prisma.user.findUnique({ where: { studentId: student.id } })).toMatchObject({ name: "Atomic Student", role: UserRole.STUDENT });
    expect(await prisma.feeAssignment.findUnique({ where: { studentId: student.id } })).toMatchObject({ amountMinor: 900000, academicYear: "2026/27" });
    expect(await prisma.auditEvent.count({ where: { entityType: "Student", entityId: student.id, action: "STUDENT_ENROLLED" } })).toBe(1);
  });

  it("does not leave partial student records when the required fee rule is absent", async () => {
    const { first, staff } = await catalogue();
    await expect(enrolStudent({
      fullName: "No Rule Student",
      email: "no-rule@example.test",
      dateOfBirth: new Date("2001-05-05"),
      programmeId: first.id,
      academicYear: "2028/29",
    }, staff.id)).rejects.toMatchObject({ status: 409 });
    expect(await prisma.student.count()).toBe(0);
    expect(await prisma.user.count({ where: { role: UserRole.STUDENT } })).toBe(0);
    expect(await prisma.feeAssignment.count()).toBe(0);
  });

  it("issues distinct, contiguous student IDs under concurrent enrolments", async () => {
    const { first, staff } = await catalogue();
    const students = await Promise.all(["one", "two", "three"].map((suffix) => enrolStudent({
      fullName: `Concurrent ${suffix}`,
      email: `concurrent-${suffix}@example.test`,
      dateOfBirth: new Date("2001-05-05"),
      programmeId: first.id,
      academicYear: "2026/27",
    }, staff.id)));
    expect(students.map((student) => student.studentCode).sort()).toEqual([
      "SMS-2026-0001",
      "SMS-2026-0002",
      "SMS-2026-0003",
    ]);
  });

  it("only re-snapshots an assignment before any finance or academic activity", async () => {
    const { first, second, staff } = await catalogue();
    const student = await enrolStudent({
      fullName: "Snapshot Student",
      email: "snapshot@example.test",
      dateOfBirth: new Date("2001-05-05"),
      programmeId: first.id,
      academicYear: "2026/27",
    }, staff.id);
    const initialAssignment = await prisma.feeAssignment.findUniqueOrThrow({ where: { studentId: student.id } });

    const updated = await updateStudent({
      studentId: student.id,
      fullName: student.fullName,
      email: student.email,
      programmeId: second.id,
      academicYear: "2027/28",
      status: student.status,
    }, staff.id);
    const resnapshotted = await prisma.feeAssignment.findUniqueOrThrow({ where: { studentId: student.id } });
    expect(updated.programmeId).toBe(second.id);
    expect(resnapshotted.id).not.toBe(initialAssignment.id);
    expect(resnapshotted).toMatchObject({ amountMinor: 950000, academicYear: "2027/28" });

    await prisma.payment.create({ data: { feeAssignmentId: resnapshotted.id, amountMinor: 100, receivedOn: new Date("2027-09-01"), reference: "SNAPSHOT-ACTIVITY" } });
    await expect(updateStudent({
      studentId: student.id,
      fullName: student.fullName,
      email: student.email,
      programmeId: first.id,
      academicYear: "2026/27",
      status: student.status,
    }, staff.id)).rejects.toMatchObject({ status: 409 });
  });
});
