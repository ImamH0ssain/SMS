"use client";

import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

export function RouteError({ destination, error, reset }: { destination: string; error: Error & { digest?: string }; reset: () => void }) {
  console.error("Route rendering failed", { digest: error.digest });
  const diagnosticId = error.digest ?? "unavailable";
  return <section className="mx-auto grid max-w-lg justify-items-start gap-4 rounded-xl border border-red-200 bg-white p-6 shadow-sm" role="alert">
    <span className="grid size-10 place-items-center rounded-lg bg-red-50 text-red-700"><AlertTriangle aria-hidden="true" className="size-5" /></span>
    <div><h1 className="text-xl font-semibold text-slate-950">This page could not be loaded</h1><p className="mt-2 text-sm leading-6 text-slate-600">No record has been changed. Try again, or return to the relevant work queue.</p><p className="mt-2 text-xs text-slate-500">Diagnostic ID: {diagnosticId}</p></div>
    <div className="flex flex-wrap gap-3"><Button type="button" onClick={reset}><RefreshCw aria-hidden="true" className="size-4" />Try again</Button><Button asChild variant="secondary"><Link href={destination}>Return to work queue</Link></Button></div>
  </section>;
}
