"use server";

import { revalidatePath } from "next/cache";
import { parseMoneyToMinor, parseSignedMoneyToMinor } from "@/lib/money";
import { requireStaff } from "@/lib/session";
import { createAdjustment, recordPayment, voidPayment } from "@/features/finance/service-mutations";
import { actionFailure, type ActionState } from "@/lib/action-state";

export async function recordPaymentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff();
    const amountMinor = parseMoneyToMinor(String(formData.get("amount") ?? ""));
    if (amountMinor === null) return { ok: false, message: "Enter a valid payment amount.", fieldErrors: { amount: ["Enter a valid amount in pounds and pence."] } };
    const studentId = String(formData.get("studentId") ?? "");
    await recordPayment({ studentId, amountMinor, receivedOn: new Date(String(formData.get("receivedOn") ?? "")), reference: String(formData.get("reference") ?? "") }, staff.userId);
    revalidatePath("/staff/dashboard"); revalidatePath(`/staff/students/${String(formData.get("studentCode"))}`);
    return { ok: true, message: "Payment recorded." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function voidPaymentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff();
    await voidPayment(String(formData.get("paymentId") ?? ""), String(formData.get("reason") ?? ""), staff.userId);
    revalidatePath("/staff/dashboard"); revalidatePath(`/staff/students/${String(formData.get("studentCode"))}`);
    return { ok: true, message: "Payment voided." };
  } catch (error) {
    return actionFailure(error);
  }
}

export async function createAdjustmentAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff();
    const amountMinor = parseSignedMoneyToMinor(String(formData.get("amount") ?? ""));
    if (amountMinor === null || amountMinor === 0) return { ok: false, message: "Enter a non-zero signed adjustment amount.", fieldErrors: { amount: ["Use a signed amount such as -50.00 or 50.00."] } };
    const studentId = String(formData.get("studentId") ?? "");
    const studentCode = String(formData.get("studentCode") ?? "");
    await createAdjustment({ studentId, amountMinor, reason: String(formData.get("reason") ?? "") }, staff.userId);
    revalidatePath("/staff/dashboard");
    revalidatePath(`/staff/students/${studentCode}`);
    return { ok: true, message: "Adjustment recorded." };
  } catch (error) {
    return actionFailure(error);
  }
}
