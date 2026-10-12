import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { EnrolmentStatus, PrismaClient, ResultStatus, UserRole } from "@/generated/prisma/client";
import { gradingGrid } from "@/features/assessments/service";
import { publishedResultsForStudent } from "@/features/results/projections";
import { saveResult } from "@/features/results/service";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

async function fixture() {
  const staff = await prisma.user.create({ data: { name: "Grading Staff", role: UserRole.REGISTRY_STAFF } });
  const programme = await prisma.programme.create({ data: { code: "GRID-CS", name: "Grading Computing" } });
  const moduleRecord = await prisma.module.create({ data: { code: "GRID101", name: "Grading Module", programmeId: programme.id } });
  const assessment = await prisma.assessment.create({
    data: {
      title: "Historical gradeability",
      moduleId: moduleRecord.id,
      academicYear: "2026/27",
      deadline: new Date("2026-12-01T12:00:00.000Z"),
      createdById: staff.id,
    },
  });
  const createStudent = (studentCode: string, fullName: string, status: EnrolmentStatus) =>
    prisma.student.create({
      data: {
        studentCode,
        fullName,
        email: `${studentCode.toLowerCase()}@example.test`,
        dateOfBirth: new Date("2000-01-01"),
        programmeId: programme.id,
        academicYear: "2026/27",
        status,
      },
    });

  const eligible = await createStudent("SMS-2026-9101", "Eligible Student", EnrolmentStatus.ENROLLED);
  const withdrawnAfterSubmitting = await createStudent("SMS-2026-9102", "Withdrawn Submitter", EnrolmentStatus.WITHDRAWN);
  const historicResult = await createStudent("SMS-2026-9103", "Historic Result", EnrolmentStatus.COMPLETED);

  const submission = await prisma.submission.create({
    data: { studentId: withdrawnAfterSubmitting.id, assessmentId: assessment.id },
  });
  const revision = await prisma.submissionRevision.create({
    data: {
      submissionId: submission.id,
      revisionNumber: 1,
      isLate: false,
      fileName: "submitted.pdf",
      mimeType: "application/pdf",
      sizeBytes: 5,
      storageKey: "grid-withdrawn-revision",
    },
  });
  await prisma.submission.update({ where: { id: submission.id }, data: { currentRevisionId: revision.id } });
  await prisma.result.create({
    data: { studentId: historicResult.id, assessmentId: assessment.id, grade: 58, status: ResultStatus.DRAFT },
  });

  return { assessment, eligible, historicResult, staff, withdrawnAfterSubmitting };
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

describe("grading-grid historical membership", () => {
  it("unions eligible students, historic submitters, and historic results, and lets staff grade each", async () => {
    const { assessment, eligible, historicResult, staff, withdrawnAfterSubmitting } = await fixture();

    const grid = await gradingGrid(assessment.id);
    expect(grid.rows.map((row) => row.student.id)).toEqual([
      eligible.id,
      historicResult.id,
      withdrawnAfterSubmitting.id,
    ]);

    await expect(saveResult({ studentId: eligible.id, assessmentId: assessment.id, grade: 70, status: ResultStatus.DRAFT }, staff.id)).resolves.toMatchObject({ studentId: eligible.id });
    await expect(saveResult({ studentId: withdrawnAfterSubmitting.id, assessmentId: assessment.id, grade: 65, status: ResultStatus.DRAFT }, staff.id)).resolves.toMatchObject({ studentId: withdrawnAfterSubmitting.id });
    await expect(saveResult({ studentId: historicResult.id, assessmentId: assessment.id, grade: 60, status: ResultStatus.PUBLISHED, version: 0 }, staff.id)).resolves.toMatchObject({ studentId: historicResult.id, status: ResultStatus.PUBLISHED });
    expect(await publishedResultsForStudent(historicResult.id)).toHaveLength(1);
    expect(await publishedResultsForStudent(eligible.id)).toHaveLength(0);
  });
});

describe("result lifecycle integrity", () => {
  it("rejects stale writes and enforces withholding, publication, and retraction transitions", async () => {
    const { assessment, eligible, staff } = await fixture();

    const created = await saveResult(
      { studentId: eligible.id, assessmentId: assessment.id, grade: 61, status: ResultStatus.DRAFT },
      staff.id,
    );
    expect(created.version).toBe(0);

    await expect(
      saveResult(
        { studentId: eligible.id, assessmentId: assessment.id, grade: 62, status: ResultStatus.PUBLISHED, version: 0 },
        staff.id,
      ),
    ).resolves.toMatchObject({ status: ResultStatus.PUBLISHED, version: 1 });

    await expect(
      saveResult(
        { studentId: eligible.id, assessmentId: assessment.id, grade: 63, status: ResultStatus.PUBLISHED, version: 0 },
        staff.id,
      ),
    ).rejects.toMatchObject({ status: 409 });

    await expect(
      saveResult(
        { studentId: eligible.id, assessmentId: assessment.id, grade: 63, status: ResultStatus.WITHHELD, version: 1 },
        staff.id,
      ),
    ).rejects.toMatchObject({ status: 422 });

    const withheld = await saveResult(
      {
        studentId: eligible.id,
        assessmentId: assessment.id,
        grade: 63,
        status: ResultStatus.WITHHELD,
        withheldReason: "Academic integrity review",
        version: 1,
      },
      staff.id,
    );
    expect(withheld).toMatchObject({ status: ResultStatus.WITHHELD, version: 2, withheldReason: "Academic integrity review" });

    await expect(
      saveResult(
        { studentId: eligible.id, assessmentId: assessment.id, grade: 64, status: ResultStatus.DRAFT, version: 2 },
        staff.id,
      ),
    ).rejects.toMatchObject({ status: 409 });

    const republished = await saveResult(
      { studentId: eligible.id, assessmentId: assessment.id, grade: 64, status: ResultStatus.PUBLISHED, version: 2 },
      staff.id,
    );
    expect(republished).toMatchObject({ status: ResultStatus.PUBLISHED, version: 3, grade: 64 });

    const auditEvents = await prisma.auditEvent.findMany({
      where: { entityType: "Result", entityId: created.id },
      orderBy: { createdAt: "asc" },
    });
    expect(auditEvents).toHaveLength(4);
    expect(auditEvents.every((event) => event.actorId === staff.id)).toBe(true);
  });
});
