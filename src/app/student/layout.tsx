import { AppShell } from "@/components/app-shell";
import { requireStudent } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  await requireStudent();
  return <AppShell>{children}</AppShell>;
}
