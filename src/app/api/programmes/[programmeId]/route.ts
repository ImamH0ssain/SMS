import { NextRequest } from "next/server";
import { z } from "zod";
import { auditData } from "@/lib/audit";
import { apiError, AppError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const schema = z.object({ code: z.string().trim().min(2).max(32).optional(), name: z.string().trim().min(2).max(120).optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, "Provide at least one field.");

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ programmeId: string }> }) {
  try {
    const staff = await requireStaff(); const { programmeId } = await params; const input = schema.parse(await request.json());
    const exists = await prisma.programme.findUnique({ where: { id: programmeId } }); if (!exists) throw new AppError("NOT_FOUND", 404, "Resource not found.");
    const programme = await prisma.$transaction(async (tx) => { const updated = await tx.programme.update({ where: { id: programmeId }, data: { ...input, ...(input.code ? { code: input.code.toUpperCase() } : {}) } }); await tx.auditEvent.create({ data: auditData(staff.userId, "PROGRAMME_UPDATED", "Programme", programmeId, { changed: input }) }); return updated; });
    return ok(programme);
  } catch (error) { return apiError(error); }
}
