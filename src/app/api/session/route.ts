import { NextRequest, NextResponse } from "next/server";
import { apiError, AppError, ok } from "@/lib/http";
import { env } from "@/lib/env";
import { clearDemoSessionResponse, createDemoSession, setDemoSessionResponse } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json() as { userId?: string };
    if (!userId) return NextResponse.json({ error: { code: "VALIDATION_ERROR", message: "userId is required." } }, { status: 422 });
    const { token, secure } = await createDemoSession(userId, request.headers);
    return setDemoSessionResponse(ok({ signedIn: true }), token, secure);
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!env.ENABLE_DEMO_SESSION) throw new AppError("NOT_FOUND", 404, "Resource not found.");
    return clearDemoSessionResponse(ok({ signedOut: true }), request);
  } catch (error) { return apiError(error); }
}
