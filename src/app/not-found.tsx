import Link from "next/link";
import { SearchX } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-6"><section className="max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><SearchX aria-hidden="true" className="size-8 text-slate-500" /><h1 className="mt-4 text-xl font-semibold text-slate-950">Page not found</h1><p className="mt-2 text-sm leading-6 text-slate-600">The requested page or record is unavailable.</p><Button asChild className="mt-5"><Link href="/">Return to demo identities</Link></Button></section></main>;
}
