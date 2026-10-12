"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { auditData } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { parseMoneyToMinor } from "@/lib/money";
import { actionFailure, type ActionState } from "@/lib/action-state";

export async function createProgrammeAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff();
    await prisma.$transaction(async (tx) => { const programme = await tx.programme.create({ data: { code: String(formData.get("code")).trim().toUpperCase(), name: String(formData.get("name")).trim() } }); await tx.auditEvent.create({ data: auditData(staff.userId, "PROGRAMME_CREATED", "Programme", programme.id) }); });
    revalidatePath("/staff/settings/programmes");
    return { ok: true, message: "Programme added." };
  } catch (error) { return actionFailure(error); }
}
export async function createModuleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff();
    await prisma.$transaction(async (tx) => { const moduleRecord = await tx.module.create({ data: { code: String(formData.get("code")).trim().toUpperCase(), name: String(formData.get("name")).trim(), programmeId: String(formData.get("programmeId")) } }); await tx.auditEvent.create({ data: auditData(staff.userId, "MODULE_CREATED", "Module", moduleRecord.id) }); });
    revalidatePath("/staff/settings/programmes");
    return { ok: true, message: "Module added." };
  } catch (error) { return actionFailure(error); }
}
export async function createFeeRuleAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const staff = await requireStaff();
    const amountMinor = parseMoneyToMinor(String(formData.get("amount") ?? ""));
    if (amountMinor === null) return { ok: false, message: "Enter a valid fee amount.", fieldErrors: { amount: ["Enter a valid amount in pounds and pence."] } };
    await prisma.$transaction(async (tx) => { const rule = await tx.programmeFeeRule.create({ data: { programmeId: String(formData.get("programmeId")), academicYear: String(formData.get("academicYear")), amountMinor, dueDate: new Date(String(formData.get("dueDate"))) } }); await tx.auditEvent.create({ data: auditData(staff.userId, "FEE_RULE_CREATED", "ProgrammeFeeRule", rule.id) }); });
    revalidatePath("/staff/settings/programmes");
    return { ok: true, message: "Fee rule added." };
  } catch (error) { return actionFailure(error); }
}
