import { NextRequest } from "next/server";
import { EnrolmentStatus } from "@/generated/prisma/client";
import { submissionTiming } from "@/features/submissions/rules";
import { localDiskStorage } from "@/features/submissions/storage";
import { validateSubmissionFile } from "@/features/submissions/validate";
import { auditData } from "@/lib/audit";
import { now } from "@/lib/clock";
import { apiError, AppError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ assessmentId: string }> }) {
  let storedKey: string | undefined;
  try {
    const session = await requireStudent();
    const { assessmentId } = await params;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new AppError("VALIDATION_ERROR", 422, "Select a file to upload.");
    const [student, assessment, current] = await Promise.all([
      prisma.student.findUniqueOrThrow({ where: { id: session.studentId } }),
      prisma.assessment.findUnique({ where: { id: assessmentId }, include: { module: true } }),
      prisma.submission.findUnique({ where: { studentId_assessmentId: { studentId: session.studentId, assessmentId } } }),
    ]);
    if (!assessment) throw new AppError("NOT_FOUND", 404, "Resource not found.");
    if (student.status !== EnrolmentStatus.ENROLLED || student.programmeId !== assessment.module.programmeId || student.academicYear !== assessment.academicYear) {
      throw new AppError("FORBIDDEN", 403, "You are not eligible to submit to this assessment.");
    }
    const timing = submissionTiming(now(), assessment.deadline, Boolean(current), assessment.closedAt);
    const metadata = await validateSubmissionFile(file);
    const stored = await localDiskStorage.put(file);
    storedKey = stored.key;
    const submission = await prisma.$transaction(async (tx) => {
      const parent = current ?? await tx.submission.create({ data: { studentId: student.id, assessmentId } });
      const revisionNumber = (await tx.submissionRevision.count({ where: { submissionId: parent.id } })) + 1;
      const revision = await tx.submissionRevision.create({ data: { submissionId: parent.id, revisionNumber, isLate: timing.isLate, fileName: metadata.name, mimeType: metadata.mimeType, sizeBytes: stored.sizeBytes, storageKey: stored.key } });
      await tx.submission.update({ where: { id: parent.id }, data: { currentRevisionId: revision.id } });
      await tx.auditEvent.create({ data: auditData(session.userId, "SUBMISSION_REVISION_CREATED", "Submission", parent.id, { revisionNumber, isLate: timing.isLate }) });
      return { parent, revision };
    });
    return ok({ submissionId: submission.parent.id, revisionId: submission.revision.id, isLate: timing.isLate }, { status: 201 });
  } catch (error) {
    if (storedKey) await localDiskStorage.delete(storedKey);
    return apiError(error);
  }
}
