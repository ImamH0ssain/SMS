"use server";

import { revalidatePath } from "next/cache";
import { ResultStatus } from "@/generated/prisma/client";
import { saveResult } from "@/features/results/service";
import { requireStaff } from "@/lib/session";

export async function saveResultAction(formData: FormData) {
  const staff = await requireStaff();
  const assessmentId = String(formData.get("assessmentId"));
  await saveResult({ studentId: String(formData.get("studentId")), assessmentId, grade: Number(formData.get("grade")), status: String(formData.get("status")) as ResultStatus, withheldReason: String(formData.get("withheldReason") ?? "") || undefined, version: Number(formData.get("version") ?? 0), overrideOverdue: formData.get("overrideOverdue") === "true" }, staff.userId);
  revalidatePath(`/staff/results?assessmentId=${assessmentId}`); revalidatePath("/student/results"); revalidatePath("/student/home");
}
