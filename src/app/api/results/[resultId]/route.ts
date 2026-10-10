import { NextRequest } from "next/server";
import { z } from "zod";
import { ResultStatus } from "@/generated/prisma/client";
import { saveResult } from "@/features/results/service";
import { apiError, AppError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const patchSchema = z.object({ grade: z.number().int().min(0).max(100), status: z.nativeEnum(ResultStatus), withheldReason: z.string().max(500).optional(), version: z.number().int().nonnegative(), overrideOverdue: z.boolean().optional() });

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ resultId: string }> }) {
  try {
    const staff = await requireStaff();
    const { resultId } = await params;
    const existing = await prisma.result.findUnique({ where: { id: resultId } });
    if (!existing) throw new AppError("NOT_FOUND", 404, "Resource not found.");
    const input = patchSchema.parse(await request.json());
    return ok(await saveResult({ ...input, studentId: existing.studentId, assessmentId: existing.assessmentId }, staff.userId));
  } catch (error) { return apiError(error); }
}
