import { NextRequest } from "next/server";
import { z } from "zod";
import { auditData } from "@/lib/audit";
import { apiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const schema = z.object({ code: z.string().min(2).max(32), name: z.string().min(2).max(120), programmeId: z.string().min(1) });
export async function GET() { try { await requireStaff(); return ok(await prisma.module.findMany({ include: { programme: true }, orderBy: { code: "asc" } })); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) { try { const staff = await requireStaff(); const input = schema.parse(await request.json()); const moduleRecord = await prisma.$transaction(async (tx) => { const created = await tx.module.create({ data: { ...input, code: input.code.trim().toUpperCase(), name: input.name.trim() } }); await tx.auditEvent.create({ data: auditData(staff.userId, "MODULE_CREATED", "Module", created.id) }); return created; }); return ok(moduleRecord, { status: 201 }); } catch (error) { return apiError(error); } }
