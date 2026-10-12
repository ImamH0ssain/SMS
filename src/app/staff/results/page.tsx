import { BarChart3, ClipboardCheck, Search } from "lucide-react";

import { saveResultAction } from "@/app/actions/results";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ResultUpdateForm } from "@/components/result-update-form";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { gradingGrid } from "@/features/assessments/service";
import { isOverdue, outstandingBalance } from "@/features/finance/rules";
import { classifyGrade } from "@/features/results/rules";
import { organisationDate } from "@/lib/clock";
import { prisma } from "@/lib/prisma";

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ assessmentId?: string }> }) {
  const { assessmentId } = await searchParams;
  const assessments = await prisma.assessment.findMany({ include: { module: true }, orderBy: { deadline: "desc" } });
  const selected = assessmentId ?? assessments[0]?.id;
  const grid = selected ? await gradingGrid(selected) : null;
  const feeAssignments = grid?.rows.length ? await prisma.feeAssignment.findMany({
    where: { studentId: { in: grid.rows.map((row) => row.student.id) } },
    include: { payments: { where: { status: "ACTIVE" }, select: { amountMinor: true } }, adjustments: { select: { amountMinor: true } } },
  }) : [];
  const overdueStudents = new Set(feeAssignments.filter((assignment) => isOverdue(
    outstandingBalance(assignment.amountMinor, assignment.adjustments.reduce((sum, adjustment) => sum + adjustment.amountMinor, 0), assignment.payments.reduce((sum, payment) => sum + payment.amountMinor, 0)),
    assignment.dueDate,
    organisationDate(),
  )).map((assignment) => assignment.studentId));

  return <div className="space-y-6">
    <PageHeader eyebrow="Marksheet and results" title="Grading grid" description="The grid retains withdrawn students with a submission or historic result. Students can see marks only after formal publication." />
    {assessments.length ? <Card><CardContent className="p-5"><form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="grid flex-1 gap-2"><Label htmlFor="assessmentId">Assessment</Label><select id="assessmentId" name="assessmentId" defaultValue={selected} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15">{assessments.map((assessment) => <option key={assessment.id} value={assessment.id}>{assessment.module.code} — {assessment.title} ({assessment.academicYear})</option>)}</select></div><button type="submit" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"><Search aria-hidden="true" className="size-4" />Load assessment</button></form></CardContent></Card> : <EmptyState icon={ClipboardCheck} title="No assessment is ready for grading" description="Create an assessment before recording grades and result outcomes." />}
    {grid ? <section aria-labelledby="grading-grid-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h2 id="grading-grid-heading" className="text-base font-semibold text-slate-950">{grid.assessment.title}</h2><Badge variant="neutral">{grid.assessment.module.code}</Badge></div><p className="mt-1 text-sm text-slate-600">{grid.rows.length} gradeable student{grid.rows.length === 1 ? "" : "s"}. Historical membership is retained after withdrawal.</p></div><span className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-700"><BarChart3 aria-hidden="true" className="size-4" /></span></div><div className="overflow-x-auto"><table className="min-w-[74rem] w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase"><tr><th scope="col" className="px-5 py-3">Student</th><th scope="col" className="px-4 py-3">Submission</th><th scope="col" className="px-4 py-3">Current result</th><th scope="col" className="px-5 py-3">Record outcome</th></tr></thead><tbody className="divide-y divide-slate-100">{grid.rows.map(({ student, submission, result }) => { const overdue = overdueStudents.has(student.id); return <tr key={student.id} className="align-top hover:bg-slate-50/60"><td className="px-5 py-4"><span className="font-semibold text-slate-950">{student.fullName}</span><span className="mt-0.5 block text-xs text-slate-500">{student.studentCode} · {student.status.toLowerCase()}</span>{overdue ? <Badge variant="warning" className="mt-2">Overdue fees</Badge> : null}</td><td className="px-4 py-4">{submission ? <div className="space-y-1"><StatusBadge value={submission.currentRevision?.isLate ? "LATE" : "SUBMITTED"} /><p className="text-xs text-slate-500">Revision {submission.currentRevision?.revisionNumber ?? 0}</p></div> : <Badge variant="neutral">Not submitted</Badge>}</td><td className="px-4 py-4">{result ? <div className="space-y-1"><p><span className="font-bold tabular-nums text-slate-950">{result.grade}</span><span className="text-slate-500">/100</span></p><p className="text-xs text-slate-600">{classifyGrade(result.grade)}</p><StatusBadge value={result.status} /></div> : <Badge variant="neutral">Not graded</Badge>}</td><td className="px-5 py-4"><ResultUpdateForm action={saveResultAction} studentId={student.id} assessmentId={grid.assessment.id} grade={result?.grade} status={result?.status} version={result?.version} withheldReason={result?.withheldReason} hasOverdueBalance={overdue} /></td></tr>; })}</tbody></table></div></section> : null}
  </div>;
}
