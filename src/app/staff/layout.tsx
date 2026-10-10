import { AppShell } from "@/components/app-shell";
import { requireStaff } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  return <AppShell>{children}</AppShell>;
}
