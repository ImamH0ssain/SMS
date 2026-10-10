import { NextRequest } from "next/server";
import { z } from "zod";
import { EnrolmentStatus } from "@/generated/prisma/client";
import { updateStudent } from "@/features/students/service";
import { apiError, AppError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const patchSchema = z.object({ fullName: z.string().min(1).max(160), email: z.string().email().max(320), programmeId: z.string().min(1), academicYear: z.string().regex(/^\d{4}\/\d{2}$/), status: z.nativeEnum(EnrolmentStatus), statusReason: z.string().max(500).optional() });

export async function GET(_request: NextRequest, { params }: { params: Promise<{ studentCode: string }> }) {
  try {
    await requireStaff();
    const { studentCode } = await params;
    const student = await prisma.student.findUnique({ where: { studentCode }, include: { programme: true, feeAssignment: { include: { payments: true } }, submissions: true, results: true } });
    if (!student) throw new AppError("NOT_FOUND", 404, "Resource not found.");
    return ok(student);
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ studentCode: string }> }) {
  try {
    const staff = await requireStaff();
    const { studentCode } = await params;
    const student = await prisma.student.findUnique({ where: { studentCode } });
    if (!student) throw new AppError("NOT_FOUND", 404, "Resource not found.");
    return ok(await updateStudent({ studentId: student.id, ...patchSchema.parse(await request.json()) }, staff.userId));
  } catch (error) { return apiError(error); }
}
