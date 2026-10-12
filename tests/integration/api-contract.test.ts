import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { AppError } from "@/lib/http";

const mocks = vi.hoisted(() => ({
  requireStaff: vi.fn(),
  requireStudent: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  findAssessment: vi.fn(),
  findSubmission: vi.fn(),
  findRevision: vi.fn(),
  getSession: vi.fn(),
  getStream: vi.fn(),
  publishedResults: vi.fn(),
}));

vi.mock("@/lib/session", () => ({ requireStaff: mocks.requireStaff, requireStudent: mocks.requireStudent, getSession: mocks.getSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    student: { findUnique: mocks.findUnique, findUniqueOrThrow: mocks.findUniqueOrThrow },
    assessment: { findUnique: mocks.findAssessment },
    submission: { findUnique: mocks.findSubmission },
    submissionRevision: { findUnique: mocks.findRevision },
  },
}));
vi.mock("@/features/students/service", () => ({ enrolStudent: vi.fn(), updateStudent: vi.fn() }));
vi.mock("@/features/submissions/storage", () => ({ localDiskStorage: { getStream: mocks.getStream } }));
vi.mock("@/features/results/projections", () => ({ publishedResultsForStudent: mocks.publishedResults }));

import { POST as createStudent, GET as listStudents } from "@/app/api/students/route";
import { GET as getStudent } from "@/app/api/students/[studentCode]/route";
import { POST as submitAssessment } from "@/app/api/assessments/[assessmentId]/submissions/route";
import { GET as downloadSubmission } from "@/app/api/submissions/[revisionId]/download/route";
import { GET as getMyResults } from "@/app/api/me/results/route";

describe("API contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a 401 error envelope for an unauthenticated staff request", async () => {
    mocks.requireStaff.mockRejectedValueOnce(new AppError("UNAUTHENTICATED", 401, "Sign in is required."));
    const response = await listStudents(new NextRequest("http://localhost/api/students"));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: { code: "UNAUTHENTICATED", message: "Sign in is required." } });
  });

  it("returns a 403 error envelope for an unauthorized staff request", async () => {
    mocks.requireStaff.mockRejectedValueOnce(new AppError("FORBIDDEN", 403, "Staff access is required."));
    const response = await listStudents(new NextRequest("http://localhost/api/students"));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { code: "FORBIDDEN", message: "Staff access is required." } });
  });

  it("returns a 422 envelope for invalid input", async () => {
    mocks.requireStaff.mockResolvedValueOnce({ userId: "staff-1" });
    const response = await createStudent(new NextRequest("http://localhost/api/students", { method: "POST", body: JSON.stringify({ email: "invalid" }), headers: { "content-type": "application/json" } }));
    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fieldErrors).toBeDefined();
  });

  it("returns a 404 envelope for a missing resource", async () => {
    mocks.requireStaff.mockResolvedValueOnce({ userId: "staff-1" });
    mocks.findUnique.mockResolvedValueOnce(null);
    const response = await getStudent(new NextRequest("http://localhost/api/students/missing"), { params: Promise.resolve({ studentCode: "missing" }) });
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: { code: "NOT_FOUND", message: "Resource not found." } });
  });

  it("returns a 401 envelope for an unauthenticated submission", async () => {
    mocks.requireStudent.mockRejectedValueOnce(new AppError("UNAUTHENTICATED", 401, "Sign in is required."));
    const response = await submitAssessment(new NextRequest("http://localhost/api/assessments/a/submissions", { method: "POST" }), { params: Promise.resolve({ assessmentId: "a" }) });
    expect(response.status).toBe(401);
  });

  it("returns a 422 envelope when a submission has no file", async () => {
    mocks.requireStudent.mockResolvedValueOnce({ userId: "student-user", studentId: "student-1" });
    const response = await submitAssessment(new NextRequest("http://localhost/api/assessments/a/submissions", { method: "POST", body: new FormData() }), { params: Promise.resolve({ assessmentId: "a" }) });
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: { code: "VALIDATION_ERROR", message: "Select a file to upload." } });
  });

  it("returns a 404 envelope when a submission targets a missing assessment", async () => {
    mocks.requireStudent.mockResolvedValueOnce({ userId: "student-user", studentId: "student-1" });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({
      id: "student-1",
      status: "ENROLLED",
      programmeId: "programme-1",
      academicYear: "2026/27",
    });
    mocks.findAssessment.mockResolvedValueOnce(null);
    mocks.findSubmission.mockResolvedValueOnce(null);
    const form = new FormData();
    form.set("file", new File([Buffer.from("%PDF-1.7")], "work.pdf", { type: "application/pdf" }));

    const response = await submitAssessment(
      new NextRequest("http://localhost/api/assessments/missing/submissions", { method: "POST", body: form }),
      { params: Promise.resolve({ assessmentId: "missing" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: { code: "NOT_FOUND", message: "Resource not found." } });
  });

  it("returns a 422 envelope when a file signature is invalid", async () => {
    mocks.requireStudent.mockResolvedValueOnce({ userId: "student-user", studentId: "student-1" });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({
      id: "student-1",
      status: "ENROLLED",
      programmeId: "programme-1",
      academicYear: "2026/27",
    });
    mocks.findAssessment.mockResolvedValueOnce({
      id: "assessment-1",
      deadline: new Date("2099-12-01T12:00:00.000Z"),
      closedAt: null,
      academicYear: "2026/27",
      module: { programmeId: "programme-1" },
    });
    mocks.findSubmission.mockResolvedValueOnce(null);
    const form = new FormData();
    form.set("file", new File([Buffer.from("not-a-pdf")], "work.pdf", { type: "application/pdf" }));

    const response = await submitAssessment(
      new NextRequest("http://localhost/api/assessments/assessment-1/submissions", { method: "POST", body: form }),
      { params: Promise.resolve({ assessmentId: "assessment-1" }) },
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({ error: { code: "VALIDATION_ERROR", message: "Upload a valid PDF file." } });
  });

  it("returns a 403 envelope when a student is not eligible for an assessment", async () => {
    mocks.requireStudent.mockResolvedValueOnce({ userId: "student-user", studentId: "student-1" });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({
      id: "student-1",
      status: "WITHDRAWN",
      programmeId: "programme-1",
      academicYear: "2026/27",
    });
    mocks.findAssessment.mockResolvedValueOnce({
      id: "assessment-1",
      deadline: new Date("2099-12-01T12:00:00.000Z"),
      closedAt: null,
      academicYear: "2026/27",
      module: { programmeId: "programme-1" },
    });
    mocks.findSubmission.mockResolvedValueOnce(null);
    const form = new FormData();
    form.set("file", new File([Buffer.from("%PDF-1.7")], "work.pdf", { type: "application/pdf" }));

    const response = await submitAssessment(
      new NextRequest("http://localhost/api/assessments/assessment-1/submissions", { method: "POST", body: form }),
      { params: Promise.resolve({ assessmentId: "assessment-1" }) },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { code: "FORBIDDEN", message: "You are not eligible to submit to this assessment." } });
  });

  it("returns a 409 envelope when an assessment is closed", async () => {
    mocks.requireStudent.mockResolvedValueOnce({ userId: "student-user", studentId: "student-1" });
    mocks.findUniqueOrThrow.mockResolvedValueOnce({
      id: "student-1",
      status: "ENROLLED",
      programmeId: "programme-1",
      academicYear: "2026/27",
    });
    mocks.findAssessment.mockResolvedValueOnce({
      id: "assessment-1",
      deadline: new Date("2099-12-01T12:00:00.000Z"),
      closedAt: new Date("2026-10-01T12:00:00.000Z"),
      academicYear: "2026/27",
      module: { programmeId: "programme-1" },
    });
    mocks.findSubmission.mockResolvedValueOnce(null);
    const form = new FormData();
    form.set("file", new File([Buffer.from("%PDF-1.7")], "work.pdf", { type: "application/pdf" }));

    const response = await submitAssessment(
      new NextRequest("http://localhost/api/assessments/assessment-1/submissions", { method: "POST", body: form }),
      { params: Promise.resolve({ assessmentId: "assessment-1" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: { code: "CONFLICT", message: "This assessment is closed for submissions." } });
  });

  it("returns a 404 envelope when a student downloads another student's revision", async () => {
    mocks.getSession.mockResolvedValueOnce({ userId: "student-user", role: "STUDENT", studentId: "student-1" });
    mocks.findRevision.mockResolvedValueOnce({
      id: "revision-1",
      fileName: "work.pdf",
      mimeType: "application/pdf",
      storageKey: "storage-1",
      submission: { studentId: "student-2" },
    });

    const response = await downloadSubmission(new Request("http://localhost/api/submissions/revision-1/download"), {
      params: Promise.resolve({ revisionId: "revision-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: { code: "NOT_FOUND", message: "Resource not found." } });
  });

  it("returns only the published-result projection for the authenticated student", async () => {
    mocks.requireStudent.mockResolvedValueOnce({ userId: "student-user", studentId: "student-1" });
    mocks.publishedResults.mockResolvedValueOnce([{ id: "published-1", status: "PUBLISHED" }]);

    const response = await getMyResults();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ data: [{ id: "published-1", status: "PUBLISHED" }] });
    expect(mocks.publishedResults).toHaveBeenCalledWith("student-1");
  });
});
