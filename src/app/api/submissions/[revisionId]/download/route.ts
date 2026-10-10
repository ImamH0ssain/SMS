import { Readable } from "node:stream";
import { UserRole } from "@/generated/prisma/client";
import { localDiskStorage } from "@/features/submissions/storage";
import { apiError, AppError } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

function attachmentName(name: string) {
  const clean = name.replace(/[\\/\r\n"]/g, "_").replace(/[^\w. -]/g, "_").trim();
  return clean || "submission";
}

export async function GET(_request: Request, { params }: { params: Promise<{ revisionId: string }> }) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHENTICATED", 401, "Sign in is required.");
    const { revisionId } = await params;
    const revision = await prisma.submissionRevision.findUnique({
      where: { id: revisionId },
      include: { submission: { select: { studentId: true } } },
    });
    if (!revision || (session.role === UserRole.STUDENT && session.studentId !== revision.submission.studentId)) {
      throw new AppError("NOT_FOUND", 404, "Resource not found.");
    }
    if (session.role !== UserRole.REGISTRY_STAFF && session.role !== UserRole.STUDENT) throw new AppError("FORBIDDEN", 403, "Access is not permitted.");
    const stream = await localDiskStorage.getStream(revision.storageKey);
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: {
        "Content-Type": revision.mimeType,
        "Content-Disposition": `attachment; filename="${attachmentName(revision.fileName)}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
