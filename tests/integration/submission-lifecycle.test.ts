import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextRequest } from "next/server";
import { readdir } from "node:fs/promises";
import { PrismaClient, UserRole } from "@/generated/prisma/client";
import { localDiskStorage } from "@/features/submissions/storage";

const session = {
  userId: "student-user",
  name: "Submission Student",
  role: UserRole.STUDENT,
  studentId: "student-id",
  studentStatus: "ENROLLED",
};

const mocks = vi.hoisted(() => ({
  requireStudent: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireStudent: mocks.requireStudent,
  getSession: mocks.getSession,
}));

import { POST as submitAssessment } from "@/app/api/assessments/[assessmentId]/submissions/route";
import { GET as downloadSubmission } from "@/app/api/submissions/[revisionId]/download/route";

const url = process.env.TEST_DATABASE_URL;
if (!url) throw new Error("TEST_DATABASE_URL is required.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

function pdf(name: string, content = "%PDF-1.7\nsubmission") {
  return new File([Buffer.from(content)], name, { type: "application/pdf" });
}

async function fixture() {
  const programme = await prisma.programme.create({ data: { code: "SUB-LIFE", name: "Submission Lifecycle" } });
  const moduleRecord = await prisma.module.create({ data: { code: "SUB101", name: "Submission Module", programmeId: programme.id } });
  const student = await prisma.student.create({
    data: {
      id: session.studentId,
      studentCode: "SMS-2026-7001",
      fullName: session.name,
      email: "submission-student@example.test",
      dateOfBirth: new Date("2000-01-01"),
      programmeId: programme.id,
      academicYear: "2026/27",
    },
  });
  await prisma.user.create({ data: { id: session.userId, name: session.name, role: UserRole.STUDENT, studentId: student.id } });
  const staff = await prisma.user.create({ data: { name: "Submission Staff", role: UserRole.REGISTRY_STAFF } });
  const assessment = await prisma.assessment.create({
    data: {
      title: "Submission Lifecycle Assessment",
      moduleId: moduleRecord.id,
      academicYear: "2026/27",
      deadline: new Date("2020-01-01T12:00:00.000Z"),
      createdById: staff.id,
    },
  });
  return { student, assessment };
}

beforeEach(async () => {
  mocks.requireStudent.mockResolvedValue(session);
  mocks.getSession.mockResolvedValue(session);
  await prisma.auditEvent.deleteMany();
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

describe("submission persistence lifecycle", () => {
  it("persists a late first upload and rejects a late resubmission", async () => {
    const { assessment } = await fixture();
    const firstForm = new FormData();
    firstForm.set("file", pdf("first.pdf", "%PDF-1.7\nfirst"));

    const firstResponse = await submitAssessment(
      new NextRequest(`http://localhost/api/assessments/${assessment.id}/submissions`, { method: "POST", body: firstForm }),
      { params: Promise.resolve({ assessmentId: assessment.id }) },
    );
    expect(firstResponse.status).toBe(201);
    const firstBody = await firstResponse.json();
    expect(firstBody.data.isLate).toBe(true);

    const firstRevision = await prisma.submissionRevision.findUniqueOrThrow({ where: { id: firstBody.data.revisionId } });
    expect(firstRevision).toMatchObject({ revisionNumber: 1, isLate: true, fileName: "first.pdf", mimeType: "application/pdf" });
    expect(await prisma.submission.findUniqueOrThrow({ where: { id: firstBody.data.submissionId } })).toMatchObject({ currentRevisionId: firstRevision.id });

    const secondForm = new FormData();
    secondForm.set("file", pdf("second.pdf", "%PDF-1.7\nsecond"));
    const secondResponse = await submitAssessment(
      new NextRequest(`http://localhost/api/assessments/${assessment.id}/submissions`, { method: "POST", body: secondForm }),
      { params: Promise.resolve({ assessmentId: assessment.id }) },
    );
    expect(secondResponse.status).toBe(409);
    await expect(secondResponse.json()).resolves.toMatchObject({ error: { code: "CONFLICT" } });

    expect(await prisma.submissionRevision.count()).toBe(1);
    expect(await prisma.auditEvent.findMany({ where: { action: "SUBMISSION_REVISION_CREATED" }, select: { actorId: true, metadata: true } })).toEqual([
      expect.objectContaining({ actorId: session.userId }),
    ]);
    await localDiskStorage.delete(firstRevision.storageKey);
  });

  it("numbers revisions, tracks the current revision, and enforces download ownership", async () => {
    const { assessment } = await fixture();
    await prisma.assessment.update({ where: { id: assessment.id }, data: { deadline: new Date("2099-12-01T12:00:00.000Z") } });
    const form = new FormData();
    form.set("file", pdf("download.pdf", "%PDF-1.7\ndownload"));
    const firstResponse = await submitAssessment(
      new NextRequest(`http://localhost/api/assessments/${assessment.id}/submissions`, { method: "POST", body: form }),
      { params: Promise.resolve({ assessmentId: assessment.id }) },
    );
    const firstBody = await firstResponse.json();
    const secondForm = new FormData();
    secondForm.set("file", pdf("download-revision-2.pdf", "%PDF-1.7\ndownload revision two"));
    const secondResponse = await submitAssessment(
      new NextRequest(`http://localhost/api/assessments/${assessment.id}/submissions`, { method: "POST", body: secondForm }),
      { params: Promise.resolve({ assessmentId: assessment.id }) },
    );
    const secondBody = await secondResponse.json();
    const revision = await prisma.submissionRevision.findUniqueOrThrow({ where: { id: secondBody.data.revisionId } });
    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(revision.revisionNumber).toBe(2);
    expect(await prisma.submission.findUniqueOrThrow({ where: { id: secondBody.data.submissionId } })).toMatchObject({ currentRevisionId: revision.id });

    const download = await downloadSubmission(new Request(`http://localhost/api/submissions/${revision.id}/download`), { params: Promise.resolve({ revisionId: revision.id }) });
    expect(download.status).toBe(200);
    expect(download.headers.get("content-disposition")).toContain("download-revision-2.pdf");
    expect(Buffer.from(await download.arrayBuffer()).toString()).toContain("download revision two");

    mocks.getSession.mockResolvedValueOnce({ ...session, studentId: "another-student" });
    const denied = await downloadSubmission(new Request(`http://localhost/api/submissions/${revision.id}/download`), { params: Promise.resolve({ revisionId: revision.id }) });
    expect(denied.status).toBe(404);
    const firstRevision = await prisma.submissionRevision.findUniqueOrThrow({ where: { id: firstBody.data.revisionId } });
    await localDiskStorage.delete(firstRevision.storageKey);
    await localDiskStorage.delete(revision.storageKey);
  });

  it("deletes stored files when the database transaction fails", async () => {
    const { assessment } = await fixture();
    const before = new Set(await readdir(".uploads").catch(() => []));
    mocks.requireStudent.mockResolvedValueOnce({ ...session, userId: "missing-audit-actor" });
    const form = new FormData();
    form.set("file", pdf("transaction-failure.pdf"));

    const response = await submitAssessment(
      new NextRequest(`http://localhost/api/assessments/${assessment.id}/submissions`, { method: "POST", body: form }),
      { params: Promise.resolve({ assessmentId: assessment.id }) },
    );

    expect(response.status).toBe(500);
    expect(await prisma.submission.count()).toBe(0);
    const after = await readdir(".uploads").catch(() => []);
    expect(after.filter((key) => !before.has(key))).toEqual([]);
  });
});
