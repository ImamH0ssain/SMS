"use client";

import {
  BarChart3,
  BookOpenCheck,
  ClipboardCheck,
  CreditCard,
  LayoutDashboard,
  Settings2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavigationProps = { staff: boolean; compact?: boolean };

const staffLinks = [
  { href: "/staff/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/staff/students", label: "Students", icon: UsersRound },
  { href: "/staff/assessments", label: "Assessments", icon: ClipboardCheck },
  { href: "/staff/results", label: "Results", icon: BarChart3 },
  { href: "/staff/settings/programmes", label: "Programme & fees", icon: Settings2 },
];

const studentLinks = [
  { href: "/student/home", label: "My home", icon: LayoutDashboard },
  { href: "/student/assessments", label: "My assessments", icon: BookOpenCheck },
  { href: "/student/results", label: "My results", icon: CreditCard },
];

export function AppNav({ staff, compact = false }: NavigationProps) {
  const pathname = usePathname();
  const links = staff ? staffLinks : studentLinks;

  return <nav aria-label={staff ? "Staff navigation" : "Student navigation"} className={cn(compact ? "flex min-w-max items-center gap-1" : "space-y-1")}>
    {links.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || (href !== "/staff/dashboard" && href !== "/student/home" && pathname.startsWith(`${href}/`));
      return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(
        "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600",
        compact && "whitespace-nowrap px-3 py-2 text-xs",
        active ? "bg-blue-50 text-blue-800" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      )}>
        <Icon aria-hidden="true" className={cn("size-4", active ? "text-blue-700" : "text-slate-400 group-hover:text-slate-700")} />
        {label}
      </Link>;
    })}
  </nav>;
}
