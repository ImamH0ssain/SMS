import { NextRequest } from "next/server";
import { z } from "zod";
import { auditData } from "@/lib/audit";
import { apiError, ok } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

const createSchema = z.object({ title: z.string().trim().min(1).max(180), moduleId: z.string().min(1), academicYear: z.string().regex(/^\d{4}\/\d{2}$/), deadline: z.coerce.date() });

export async function GET() {
  try {
    await requireStaff();
    return ok(await prisma.assessment.findMany({ include: { module: true }, orderBy: { deadline: "desc" } }));
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const staff = await requireStaff();
    const input = createSchema.parse(await request.json());
    const assessment = await prisma.$transaction(async (tx) => {
      const created = await tx.assessment.create({ data: { ...input, createdById: staff.userId } });
      await tx.auditEvent.create({ data: auditData(staff.userId, "ASSESSMENT_CREATED", "Assessment", created.id) });
      return created;
    });
    return ok(assessment, { status: 201 });
  } catch (error) { return apiError(error); }
}
