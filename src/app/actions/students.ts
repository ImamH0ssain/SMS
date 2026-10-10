"use server";

import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/session";
import { enrolStudent, updateStudent } from "@/features/students/service";
import { EnrolmentStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";

export async function enrolStudentAction(formData: FormData) {
  const staff = await requireStaff();
  const student = await enrolStudent({
    fullName: String(formData.get("fullName") ?? ""),
    email: String(formData.get("email") ?? ""),
    dateOfBirth: new Date(String(formData.get("dateOfBirth") ?? "")),
    programmeId: String(formData.get("programmeId") ?? ""),
    academicYear: String(formData.get("academicYear") ?? ""),
    confirmPossibleDuplicate: formData.get("confirmPossibleDuplicate") === "true",
  }, staff.userId);
  redirect(`/staff/students/${student.studentCode}`);
}

export async function updateStudentAction(formData: FormData) {
  const staff = await requireStaff();
  const studentId = String(formData.get("studentId"));
  const student = await updateStudent({ studentId, fullName: String(formData.get("fullName") ?? ""), email: String(formData.get("email") ?? ""), programmeId: String(formData.get("programmeId") ?? ""), academicYear: String(formData.get("academicYear") ?? ""), status: String(formData.get("status")) as EnrolmentStatus, statusReason: String(formData.get("statusReason") ?? "") }, staff.userId);
  revalidatePath(`/staff/students/${student.studentCode}`); redirect(`/staff/students/${student.studentCode}`);
}
