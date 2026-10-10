import { studentAssessments } from "@/features/assessments/service";
import { apiError, ok } from "@/lib/http";
import { requireStudent } from "@/lib/session";

export async function GET() {
  try {
    const session = await requireStudent();
    return ok(await studentAssessments(session.studentId));
  } catch (error) { return apiError(error); }
}
