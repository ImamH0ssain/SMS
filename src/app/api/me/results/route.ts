import { apiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireStudent();
    const results = await prisma.result.findMany({ where: { studentId: session.studentId, status: "PUBLISHED" }, include: { assessment: { include: { module: true } } } });
    return ok(results);
  } catch (error) { return apiError(error); }
}
