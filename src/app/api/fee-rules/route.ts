import { NextRequest } from "next/server";
import { z } from "zod";
import { auditData } from "@/lib/audit";
import { apiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const schema = z.object({ programmeId: z.string().min(1), academicYear: z.string().regex(/^\d{4}\/\d{2}$/), amountMinor: z.number().int().positive(), dueDate: z.coerce.date() });
export async function GET() { try { await requireStaff(); return ok(await prisma.programmeFeeRule.findMany({ include: { programme: true }, orderBy: { dueDate: "asc" } })); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) { try { const staff = await requireStaff(); const input = schema.parse(await request.json()); const rule = await prisma.$transaction(async (tx) => { const created = await tx.programmeFeeRule.create({ data: input }); await tx.auditEvent.create({ data: auditData(staff.userId, "FEE_RULE_CREATED", "ProgrammeFeeRule", created.id) }); return created; }); return ok(rule, { status: 201 }); } catch (error) { return apiError(error); } }
