import { NextRequest } from "next/server";
import { z } from "zod";
import { enrolStudent } from "@/features/students/service";
import { apiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const input = z.object({ fullName: z.string().min(1), email: z.string().email(), dateOfBirth: z.coerce.date(), programmeId: z.string().min(1), academicYear: z.string().regex(/^\d{4}\/\d{2}$/), confirmPossibleDuplicate: z.boolean().optional() });

export async function GET(request: NextRequest) {
  try {
    await requireStaff();
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const students = await prisma.student.findMany({ where: query ? { OR: [{ fullName: { contains: query, mode: "insensitive" } }, { studentCode: { startsWith: query, mode: "insensitive" } }] } : {}, include: { programme: true }, take: 20, orderBy: { fullName: "asc" } });
    return ok(students);
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff();
    const student = await enrolStudent(input.parse(await request.json()), staff.userId);
    return ok(student, { status: 201 });
  } catch (error) { return apiError(error); }
}
