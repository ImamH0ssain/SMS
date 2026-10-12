import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
  }

}

export function mapPrismaError(error: unknown): unknown {
  if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2002") return error;
  const details = error as { meta?: { target?: string | string[] } };
  const target = Array.isArray(details.meta?.target) ? details.meta.target.join(",") : String(details.meta?.target ?? "");
  if (target.includes("email")) return new AppError("CONFLICT", 409, "A student already uses this email address.");
  if (target.includes("reference")) return new AppError("CONFLICT", 409, "This payment reference already exists.");
  if (target.includes("programmeId") && target.includes("academicYear")) return new AppError("CONFLICT", 409, "A fee rule already exists for this programme and academic year.");
  if (target.includes("code")) return new AppError("CONFLICT", 409, "A programme, module, or other record already uses this code.");
  return new AppError("CONFLICT", 409, "A record with these unique values already exists.");
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function apiError(error: unknown) {
  error = mapPrismaError(error);
  if (error instanceof AppError) {
    return NextResponse.json(
      { error: { code: error.code, message: error.message, fieldErrors: error.fieldErrors } },
      { status: error.status },
    );
  }
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const field = issue.path.join(".") || "form";
      (fieldErrors[field] ??= []).push(issue.message);
    }
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Check the submitted fields.", fieldErrors } },
      { status: 422 },
    );
  }
  console.error("Unhandled API error", error instanceof Error ? error.message : "Unknown error");
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } },
    { status: 500 },
  );
}
