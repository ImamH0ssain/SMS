import "server-only";
import { EnrolmentStatus } from "@/generated/prisma/client";
import { mergeGradingGrid } from "@/features/assessments/rules";
import { prisma } from "@/lib/prisma";

export async function gradingGrid(assessmentId: string) {
  const assessment = await prisma.assessment.findUniqueOrThrow({ where: { id: assessmentId }, include: { module: true } });
  const [eligible, submissions, results] = await Promise.all([
    prisma.student.findMany({ where: { status: EnrolmentStatus.ENROLLED, programmeId: assessment.module.programmeId, academicYear: assessment.academicYear } }),
    prisma.submission.findMany({ where: { assessmentId }, include: { student: true, currentRevision: true } }),
    prisma.result.findMany({ where: { assessmentId }, include: { student: true } }),
  ]);
  return { assessment, rows: mergeGradingGrid(eligible, submissions, results) };
}

export async function studentAssessments(studentId: string) {
  const student = await prisma.student.findUniqueOrThrow({ where: { id: studentId } });
  return prisma.assessment.findMany({
    where: { module: { programmeId: student.programmeId }, academicYear: student.academicYear },
    include: { module: true, submissions: { where: { studentId }, include: { currentRevision: true } } },
    orderBy: { deadline: "asc" },
  });
}
