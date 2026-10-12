import { ArrowLeft, CalendarClock, Download, FileText, LockKeyhole, RotateCcw, UsersRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAssessmentAction } from "@/app/actions/assessments";
import { EmptyState } from "@/components/empty-state";
import { ActionForm } from "@/components/action-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export default async function AssessmentDetailPage({ params }: { params: Promise<{ assessmentId: string }> }) {
  await requireStaff();
  const { assessmentId } = await params;
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId }, include: { module: true, submissions: { include: { student: true, currentRevision: true, revisions: true }, orderBy: { updatedAt: "desc" } } } });
  if (!assessment) notFound();
  const state = assessment.closedAt ? "Closed" : "Open for submissions";

  return <div className="space-y-6">
    <Link href="/staff/assessments" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to assessments</Link>
    <PageHeader eyebrow={`${assessment.module.code} · ${assessment.academicYear}`} title={assessment.title} description={`Deadline ${assessment.deadline.toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}. ${state}.`} actions={<><Badge variant={assessment.closedAt ? "neutral" : "success"}>{assessment.closedAt ? "Closed" : "Open"}</Badge><Button asChild variant="outline"><Link href={`/staff/results?assessmentId=${assessment.id}`}>Open grading grid</Link></Button></>} />

    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <section aria-labelledby="submission-worklist-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="submission-worklist-heading" className="text-base font-semibold text-slate-950">Submission worklist</h2><p className="mt-1 text-sm text-slate-600">{assessment.submissions.length} student{assessment.submissions.length === 1 ? "" : "s"} submitted work.</p></div><span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><UsersRound aria-hidden="true" className="size-4" /></span></div>
        {assessment.submissions.length ? <div className="overflow-x-auto"><table className="min-w-[47rem] w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase"><tr><th scope="col" className="px-5 py-3">Student</th><th scope="col" className="px-4 py-3">State</th><th scope="col" className="px-4 py-3">Revisions</th><th scope="col" className="px-4 py-3">Last submitted</th><th scope="col" className="px-5 py-3 text-right">File</th></tr></thead><tbody className="divide-y divide-slate-100">{assessment.submissions.map((submission) => <tr key={submission.id} className="hover:bg-slate-50/80"><td className="px-5 py-4"><span className="font-semibold text-slate-950">{submission.student.fullName}</span><span className="mt-0.5 block text-xs text-slate-500">{submission.student.studentCode}</span></td><td className="px-4 py-4">{submission.currentRevision?.isLate ? <StatusBadge value="LATE" /> : <StatusBadge value="SUBMITTED" />}</td><td className="px-4 py-4"><span className="inline-flex items-center gap-1 text-slate-700"><RotateCcw aria-hidden="true" className="size-3.5 text-slate-400" />{submission.revisions.length}</span></td><td className="px-4 py-4 whitespace-nowrap text-slate-600">{submission.currentRevision?.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) ?? "—"}</td><td className="px-5 py-4 text-right">{submission.currentRevision ? <Button asChild variant="ghost" size="sm"><a href={`/api/submissions/${submission.currentRevision.id}/download`}><Download aria-hidden="true" className="size-3.5" />Download</a></Button> : "—"}</td></tr>)}</tbody></table></div> : <EmptyState className="m-5 min-h-48 border-0 bg-slate-50" icon={FileText} title="No submissions received yet" description="The worklist will update when an eligible student uploads a PDF or DOCX." />}
      </section>

      <aside className="space-y-4"><Card><CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock aria-hidden="true" className="size-5 text-blue-700" />Assessment controls</CardTitle></CardHeader><CardContent className="space-y-5"><ActionForm action={updateAssessmentAction} className="space-y-3"><input type="hidden" name="assessmentId" value={assessment.id} /><input type="hidden" name="operation" value="deadline" /><div className="grid gap-2"><Label htmlFor="deadline">Submission deadline</Label><Input id="deadline" name="deadline" type="datetime-local" defaultValue={assessment.deadline.toISOString().slice(0, 16)} required /></div><Button type="submit" variant="outline" className="w-full">Save deadline</Button></ActionForm><div className="border-t border-slate-100 pt-5"><ActionForm action={updateAssessmentAction}><input type="hidden" name="assessmentId" value={assessment.id} /><input type="hidden" name="operation" value={assessment.closedAt ? "reopen" : "close"} /><Button type="submit" variant={assessment.closedAt ? "secondary" : "destructive"} className="w-full">{assessment.closedAt ? "Reopen assessment" : "Close assessment"}</Button></ActionForm><p className="mt-2 text-xs leading-5 text-slate-500">Closing blocks new submissions. Reopening allows eligible students to submit again under the original deadline rules.</p></div></CardContent></Card><div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-5 text-slate-600"><LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-slate-500" /><p>All deadline and state changes are audit-recorded. Existing late flags are never recomputed.</p></div></aside>
    </div>
  </div>;
}
