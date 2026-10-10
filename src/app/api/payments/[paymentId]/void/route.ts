import { NextRequest } from "next/server";
import { z } from "zod";
import { voidPayment } from "@/features/finance/service-mutations";
import { apiError, ok } from "@/lib/http";
import { requireStaff } from "@/lib/session";

const schema = z.object({ reason: z.string().trim().min(1).max(500) });
export async function POST(request: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  try { const staff = await requireStaff(); const { paymentId } = await params; return ok(await voidPayment(paymentId, schema.parse(await request.json()).reason, staff.userId)); } catch (error) { return apiError(error); }
}
