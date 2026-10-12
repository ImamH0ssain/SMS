import "server-only";

import { ResultStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** The sole Student-facing result projection: draft and withheld records never leave this boundary. */
export async function publishedResultsForStudent(studentId: string) {
  return prisma.result.findMany({
    where: { studentId, status: ResultStatus.PUBLISHED },
    include: { assessment: { include: { module: true } } },
    orderBy: { publishedAt: "desc" },
  });
}
