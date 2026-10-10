import { NextRequest } from "next/server";
import { z } from "zod";
import { auditData } from "@/lib/audit";
import { apiError, AppError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const schema = z.object({ amountMinor: z.number().int().positive().optional(), dueDate: z.coerce.date().optional() }).refine((value) => Object.keys(value).length > 0, "Provide at least one field.");

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ feeRuleId: string }> }) {
  try {
    const staff = await requireStaff(); const { feeRuleId } = await params; const input = schema.parse(await request.json());
    const exists = await prisma.programmeFeeRule.findUnique({ where: { id: feeRuleId } }); if (!exists) throw new AppError("NOT_FOUND", 404, "Resource not found.");
    const rule = await prisma.$transaction(async (tx) => { const updated = await tx.programmeFeeRule.update({ where: { id: feeRuleId }, data: input }); await tx.auditEvent.create({ data: auditData(staff.userId, "FEE_RULE_UPDATED", "ProgrammeFeeRule", feeRuleId, { changed: input }) }); return updated; });
    return ok(rule);
  } catch (error) { return apiError(error); }
}
