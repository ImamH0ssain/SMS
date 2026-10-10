import { NextRequest } from "next/server";
import { z } from "zod";
import { balanceForAssignment } from "@/features/finance/service";
import { recordPayment } from "@/features/finance/service-mutations";
import { apiError, AppError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const schema = z.object({ amountMinor: z.number().int().positive(), receivedOn: z.coerce.date(), reference: z.string().min(1).max(100) });
export async function GET(_request: NextRequest, { params }: { params: Promise<{ studentCode: string }> }) {
  try { await requireStaff(); const { studentCode } = await params; const student = await prisma.student.findUnique({ where: { studentCode }, include: { feeAssignment: { include: { payments: true } } } }); if (!student?.feeAssignment) throw new AppError("NOT_FOUND", 404, "Resource not found."); return ok({ payments: student.feeAssignment.payments, ...(await balanceForAssignment(student.feeAssignment.id)) }); } catch (error) { return apiError(error); }
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ studentCode: string }> }) {
  try { const staff = await requireStaff(); const { studentCode } = await params; const student = await prisma.student.findUnique({ where: { studentCode } }); if (!student) throw new AppError("NOT_FOUND", 404, "Resource not found."); return ok(await recordPayment({ studentId: student.id, ...schema.parse(await request.json()) }, staff.userId), { status: 201 }); } catch (error) { return apiError(error); }
}
