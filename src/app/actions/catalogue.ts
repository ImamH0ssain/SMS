"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/session";
import { auditData } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

export async function createProgrammeAction(formData: FormData) {
  const staff = await requireStaff();
  await prisma.$transaction(async (tx) => { const programme = await tx.programme.create({ data: { code: String(formData.get("code")).trim().toUpperCase(), name: String(formData.get("name")).trim() } }); await tx.auditEvent.create({ data: auditData(staff.userId, "PROGRAMME_CREATED", "Programme", programme.id) }); });
  revalidatePath("/staff/settings/programmes");
}
export async function createModuleAction(formData: FormData) {
  const staff = await requireStaff();
  await prisma.$transaction(async (tx) => { const module = await tx.module.create({ data: { code: String(formData.get("code")).trim().toUpperCase(), name: String(formData.get("name")).trim(), programmeId: String(formData.get("programmeId")) } }); await tx.auditEvent.create({ data: auditData(staff.userId, "MODULE_CREATED", "Module", module.id) }); });
  revalidatePath("/staff/settings/programmes");
}
export async function createFeeRuleAction(formData: FormData) {
  const staff = await requireStaff();
  const amountMinor = Math.round(Number(formData.get("amount")) * 100);
  await prisma.$transaction(async (tx) => { const rule = await tx.programmeFeeRule.create({ data: { programmeId: String(formData.get("programmeId")), academicYear: String(formData.get("academicYear")), amountMinor, dueDate: new Date(String(formData.get("dueDate"))) } }); await tx.auditEvent.create({ data: auditData(staff.userId, "FEE_RULE_CREATED", "ProgrammeFeeRule", rule.id) }); });
  revalidatePath("/staff/settings/programmes");
}
