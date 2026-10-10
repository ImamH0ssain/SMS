import { overdueAccounts } from "@/features/finance/service";
import { apiError, ok } from "@/lib/http";
import { requireStaff } from "@/lib/session";

export async function GET() {
  try { await requireStaff(); return ok(await overdueAccounts()); } catch (error) { return apiError(error); }
}
