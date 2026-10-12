import { AppError, mapPrismaError } from "@/lib/http";

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialActionState: ActionState = { ok: false };

export function actionFailure(error: unknown): ActionState {
  error = mapPrismaError(error);
  if (error instanceof AppError) {
    return { ok: false, message: error.message, fieldErrors: error.fieldErrors };
  }
  if (error instanceof Error && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_")) {
    throw error;
  }
  console.error("Server action failed", error instanceof Error ? error.message : "Unknown error");
  return { ok: false, message: "Something went wrong. Check the form and try again." };
}
