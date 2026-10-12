import { apiError, ok } from "@/lib/http";
import { publishedResultsForStudent } from "@/features/results/projections";
import { requireStudent } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireStudent();
    return ok(await publishedResultsForStudent(session.studentId));
  } catch (error) { return apiError(error); }
}
