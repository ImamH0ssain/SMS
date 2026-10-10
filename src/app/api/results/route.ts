import { NextRequest } from "next/server";
import { z } from "zod";
import { ResultStatus } from "@/generated/prisma/client";
import { gradingGrid } from "@/features/assessments/service";
import { saveResult } from "@/features/results/service";
import { apiError, AppError, ok } from "@/lib/http";
import { requireStaff } from "@/lib/session";

const schema = z.object({ studentId: z.string().min(1), assessmentId: z.string().min(1), grade: z.number().int().min(0).max(100), status: z.nativeEnum(ResultStatus), withheldReason: z.string().max(500).optional(), version: z.number().int().nonnegative().optional(), overrideOverdue: z.boolean().optional() });
export async function GET(request: NextRequest) { try { await requireStaff(); const assessmentId = request.nextUrl.searchParams.get("assessmentId"); if (!assessmentId) throw new AppError("VALIDATION_ERROR", 422, "assessmentId is required."); return ok(await gradingGrid(assessmentId)); } catch (error) { return apiError(error); } }
export async function POST(request: NextRequest) { try { const staff = await requireStaff(); return ok(await saveResult(schema.parse(await request.json()), staff.userId), { status: 201 }); } catch (error) { return apiError(error); } }
