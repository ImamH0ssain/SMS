import { type LucideIcon } from "lucide-react";
import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return <div className={cn("flex min-h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center", className)}>
    <span className="mb-4 grid size-11 place-items-center rounded-full bg-slate-100 text-slate-600"><Icon aria-hidden="true" className="size-5" /></span>
    <h2 className="text-base font-semibold text-slate-950">{title}</h2>
    <p className="mt-1 max-w-md text-sm leading-6 text-slate-600">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>;
}
