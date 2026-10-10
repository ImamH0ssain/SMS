"use server";

import { redirect } from "next/navigation";
import { setDemoSessionForAction } from "@/lib/session";

export async function signInAs(formData: FormData) {
  const userId = String(formData.get("userId") ?? "");
  await setDemoSessionForAction(userId);
  const destination = String(formData.get("destination") ?? "/");
  redirect(destination);
}
