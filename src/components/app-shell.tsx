import Link from "next/link";
import { Landmark, LogOut, ShieldCheck } from "lucide-react";

import { AppNav } from "@/components/app-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getSession } from "@/lib/session";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const staff = session?.role === "REGISTRY_STAFF";
  const role = staff ? "Registry staff" : "Student";

  return <div className="min-h-screen bg-slate-50 text-slate-950">
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950 text-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href={staff ? "/staff/dashboard" : "/student/home"} className="flex min-w-0 items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-blue-300">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 shadow-sm"><Landmark aria-hidden="true" className="size-4" /></span>
          <span className="min-w-0">
            <span className="block text-sm font-bold tracking-wide">SMS Registry</span>
            <span className="hidden text-xs text-slate-400 sm:block">Registry operations workspace</span>
          </span>
        </Link>

        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="hidden min-w-0 text-right lg:block">
            <p className="truncate text-xs font-medium text-slate-200">Demo mode · {session?.name ?? "Guest"}</p>
            <p className="text-[11px] text-slate-400">Viewing as {role}</p>
          </div>
          <Badge variant="default" className="hidden border-blue-400/40 bg-blue-500/15 text-blue-100 sm:inline-flex">Demo</Badge>
          <Button asChild size="sm" variant="outline" className="border-slate-600 bg-slate-900 text-slate-100 hover:bg-slate-800 hover:text-white">
            <Link href="/"><LogOut aria-hidden="true" className="size-3.5" /><span className="hidden sm:inline">Switch persona</span><span className="sm:hidden">Switch</span></Link>
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto border-t border-slate-800 bg-slate-900 px-3 py-1.5 lg:hidden">
        <AppNav staff={staff} compact />
      </div>
    </header>

    <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-[1600px] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden border-r border-slate-200 bg-white px-3 py-6 lg:block">
        <div className="mb-5 flex items-center gap-2 px-3 text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase"><ShieldCheck aria-hidden="true" className="size-3.5" />{staff ? "Registry" : "Student portal"}</div>
        <AppNav staff={staff} />
      </aside>
      <main className="min-w-0 px-4 py-7 sm:px-6 lg:px-9 lg:py-9 xl:px-12">{children}</main>
    </div>
  </div>;
}
