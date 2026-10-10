import { NextRequest } from "next/server";
import { z } from "zod";
import { auditData } from "@/lib/audit";
import { apiError, AppError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const patchSchema = z.object({ title: z.string().trim().min(1).max(180).optional(), deadline: z.coerce.date().optional(), closed: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "Provide at least one field.");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ assessmentId: string }> }) {
  try {
    await requireStaff();
    const { assessmentId } = await params;
    const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, include: { module: true, submissions: { include: { student: true, currentRevision: true, revisions: true } } } });
    if (!assessment) throw new AppError("NOT_FOUND", 404, "Resource not found.");
    return ok(assessment);
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ assessmentId: string }> }) {
  try {
    const staff = await requireStaff();
    const { assessmentId } = await params;
    const input = patchSchema.parse(await request.json());
    const existing = await prisma.assessment.findUnique({ where: { id: assessmentId } });
    if (!existing) throw new AppError("NOT_FOUND", 404, "Resource not found.");
    const data = { ...(input.title === undefined ? {} : { title: input.title }), ...(input.deadline === undefined ? {} : { deadline: input.deadline }), ...(input.closed === undefined ? {} : { closedAt: input.closed ? new Date() : null }) };
    const assessment = await prisma.$transaction(async (tx) => {
      const updated = await tx.assessment.update({ where: { id: assessmentId }, data });
      const action = input.closed === true ? "ASSESSMENT_CLOSED" : input.closed === false ? "ASSESSMENT_REOPENED" : input.deadline ? "ASSESSMENT_DEADLINE_CHANGED" : "ASSESSMENT_UPDATED";
      await tx.auditEvent.create({ data: auditData(staff.userId, action, "Assessment", assessmentId, { before: { deadline: existing.deadline.toISOString(), closedAt: existing.closedAt?.toISOString() ?? null }, changed: input }) });
      return updated;
    });
    return ok(assessment);
  } catch (error) { return apiError(error); }
}
