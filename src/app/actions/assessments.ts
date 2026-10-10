"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auditData } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export async function createAssessmentAction(formData: FormData) {
  const staff = await requireStaff();
  const assessment = await prisma.assessment.create({ data: { title: String(formData.get("title")).trim(), moduleId: String(formData.get("moduleId")), academicYear: String(formData.get("academicYear")), deadline: new Date(String(formData.get("deadline"))), createdById: staff.userId } });
  await prisma.auditEvent.create({ data: auditData(staff.userId, "ASSESSMENT_CREATED", "Assessment", assessment.id) });
  redirect(`/staff/assessments/${assessment.id}`);
}

export async function updateAssessmentAction(formData: FormData) {
  const staff = await requireStaff();
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const operation = String(formData.get("operation") ?? "");
  if (!assessmentId || !["deadline", "close", "reopen"].includes(operation)) throw new Error("Invalid assessment update.");
  const existing = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!existing) throw new Error("Assessment not found.");
  let data: { deadline?: Date; closedAt?: Date | null };
  let action: string;
  if (operation === "deadline") {
    const deadline = new Date(String(formData.get("deadline") ?? ""));
    if (Number.isNaN(deadline.getTime())) throw new Error("A valid deadline is required.");
    data = { deadline }; action = "ASSESSMENT_DEADLINE_CHANGED";
  } else if (operation === "close") {
    data = { closedAt: new Date() }; action = "ASSESSMENT_CLOSED";
  } else {
    data = { closedAt: null }; action = "ASSESSMENT_REOPENED";
  }
  await prisma.$transaction(async (tx) => {
    await tx.assessment.update({ where: { id: assessmentId }, data });
    await tx.auditEvent.create({ data: auditData(staff.userId, action, "Assessment", assessmentId, { before: { deadline: existing.deadline.toISOString(), closedAt: existing.closedAt?.toISOString() ?? null }, after: { deadline: data.deadline?.toISOString() ?? existing.deadline.toISOString(), closedAt: data.closedAt === undefined ? existing.closedAt?.toISOString() ?? null : data.closedAt?.toISOString() ?? null } }) });
  });
  revalidatePath(`/staff/assessments/${assessmentId}`);
  revalidatePath("/staff/assessments");
  revalidatePath("/student/assessments");
}
