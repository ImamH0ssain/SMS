"use server";

import { revalidatePath } from "next/cache";
import { parseMoneyToMinor } from "@/lib/money";
import { requireStaff } from "@/lib/session";
import { recordPayment, voidPayment } from "@/features/finance/service-mutations";

export async function recordPaymentAction(formData: FormData) {
  const staff = await requireStaff();
  const amountMinor = parseMoneyToMinor(String(formData.get("amount") ?? ""));
  if (amountMinor === null) throw new Error("Enter a valid payment amount.");
  const studentId = String(formData.get("studentId"));
  await recordPayment({ studentId, amountMinor, receivedOn: new Date(String(formData.get("receivedOn"))), reference: String(formData.get("reference")) }, staff.userId);
  revalidatePath("/staff/dashboard"); revalidatePath(`/staff/students/${String(formData.get("studentCode"))}`);
}

export async function voidPaymentAction(formData: FormData) {
  const staff = await requireStaff();
  await voidPayment(String(formData.get("paymentId")), String(formData.get("reason")), staff.userId);
  revalidatePath("/staff/dashboard"); revalidatePath(`/staff/students/${String(formData.get("studentCode"))}`);
}
