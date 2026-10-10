import { NextRequest } from "next/server";
import { z } from "zod";
import { auditData } from "@/lib/audit";
import { apiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const schema = z.object({ code: z.string().min(2).max(32), name: z.string().min(2).max(120) });
export async function GET() { try { await requireStaff(); return ok(await prisma.programme.findMany({ orderBy: { name: "asc" } })); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) { try { const staff = await requireStaff(); const input = schema.parse(await request.json()); const programme = await prisma.$transaction(async (tx) => { const created = await tx.programme.create({ data: { ...input, code: input.code.trim().toUpperCase(), name: input.name.trim() } }); await tx.auditEvent.create({ data: auditData(staff.userId, "PROGRAMME_CREATED", "Programme", created.id) }); return created; }); return ok(programme, { status: 201 }); } catch (error) { return apiError(error); } }
