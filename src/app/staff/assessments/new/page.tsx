import { ArrowLeft, ClipboardPlus, Info } from "lucide-react";
import Link from "next/link";

import { createAssessmentAction } from "@/app/actions/assessments";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";

export default async function NewAssessmentPage() {
  const modules = await prisma.module.findMany({ include: { programme: true }, orderBy: { code: "asc" } });
  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href="/staff/assessments" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to assessments</Link>
    <PageHeader eyebrow="Assessment setup" title="Create assessment" description="The module defines the eligible programme. Students may make a first submission while open, and may resubmit only by the deadline." />
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><ClipboardPlus aria-hidden="true" className="size-5 text-blue-700" />Assessment details</CardTitle></CardHeader><CardContent>
      <ActionForm action={createAssessmentAction} className="space-y-5">
        <div className="grid gap-2"><Label htmlFor="title">Title</Label><Input id="title" name="title" required autoComplete="off" placeholder="e.g. Applied Research Report" /></div>
        <div className="grid gap-2"><Label htmlFor="moduleId">Module</Label><select id="moduleId" name="moduleId" required className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15">{modules.map((module) => <option value={module.id} key={module.id}>{module.code} — {module.name} ({module.programme.code})</option>)}</select>{modules.length === 0 ? <p className="text-sm text-rose-700">Create a programme and module before creating an assessment.</p> : null}</div>
        <div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="academicYear">Academic year</Label><Input id="academicYear" name="academicYear" defaultValue="2026/27" required pattern="\d{4}/\d{2}" placeholder="YYYY/YY" /></div><div className="grid gap-2"><Label htmlFor="deadline">Submission deadline</Label><Input id="deadline" name="deadline" type="datetime-local" required /></div></div>
        <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm leading-5 text-slate-700"><Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-blue-700" /><p>Deadline changes, closing, and reopening are audit-recorded. Existing submission late flags are preserved.</p></div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5"><Button type="submit" disabled={modules.length === 0}>Create assessment</Button><Button asChild type="button" variant="outline"><Link href="/staff/assessments">Cancel</Link></Button></div>
      </ActionForm>
    </CardContent></Card>
  </div>;
}
