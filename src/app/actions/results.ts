"use server";

import { revalidatePath } from "next/cache";
import { ResultStatus } from "@/generated/prisma/client";
import { saveResult } from "@/features/results/service";
import { requireStaff } from "@/lib/session";
import { actionFailure, type ActionState } from "@/lib/action-state";

export async function saveResultAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff();
    const assessmentId = String(formData.get("assessmentId") ?? "");
    const grade = Number(formData.get("grade"));
    if (!Number.isFinite(grade)) return { ok: false, message: "Enter a grade from 0 to 100.", fieldErrors: { grade: ["Enter a numeric grade from 0 to 100."] } };
    await saveResult({ studentId: String(formData.get("studentId") ?? ""), assessmentId, grade, status: String(formData.get("status")) as ResultStatus, withheldReason: String(formData.get("withheldReason") ?? "") || undefined, version: Number(formData.get("version") ?? 0), overrideOverdue: formData.get("overrideOverdue") === "true" }, staff.userId);
    revalidatePath(`/staff/results?assessmentId=${assessmentId}`); revalidatePath("/student/results"); revalidatePath("/student/home");
    return { ok: true, message: "Result saved." };
  } catch (error) {
    return actionFailure(error);
  }
}
