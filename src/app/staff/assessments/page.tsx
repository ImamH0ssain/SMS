import { CalendarClock, ClipboardCheck, Plus } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

export default async function AssessmentsPage() {
  const assessments = await prisma.assessment.findMany({ include: { module: { include: { programme: true } }, _count: { select: { submissions: true, results: true } } }, orderBy: { deadline: "asc" } });
  return <div className="space-y-6">
    <PageHeader eyebrow="Assessment submission" title="Assessments" description="Create and manage assessment windows, then move directly into the submission worklist or grading grid." actions={<Button asChild><Link href="/staff/assessments/new"><Plus aria-hidden="true" className="size-4" />Create assessment</Link></Button>} />
    {assessments.length ? <section aria-labelledby="assessment-list-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="assessment-list-heading" className="text-base font-semibold text-slate-950">Assessment register</h2><p className="mt-1 text-sm text-slate-600">{assessments.length} assessment{assessments.length === 1 ? "" : "s"} across the active catalogue.</p></div><span className="grid size-9 place-items-center rounded-lg bg-blue-50 text-blue-700"><ClipboardCheck aria-hidden="true" className="size-4" /></span></div>
      <div className="overflow-x-auto"><table className="min-w-[51rem] w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase"><tr><th scope="col" className="px-5 py-3">Assessment</th><th scope="col" className="px-4 py-3">Module</th><th scope="col" className="px-4 py-3">Deadline</th><th scope="col" className="px-4 py-3">Submissions</th><th scope="col" className="px-5 py-3">State</th></tr></thead><tbody className="divide-y divide-slate-100">{assessments.map((assessment) => <tr key={assessment.id} className="transition-colors hover:bg-slate-50/80"><td className="px-5 py-4"><Link href={`/staff/assessments/${assessment.id}`} className="font-semibold text-blue-700 hover:underline">{assessment.title}</Link><span className="mt-0.5 block text-xs text-slate-500">{assessment.academicYear}</span></td><td className="px-4 py-4"><span className="font-medium text-slate-900">{assessment.module.code}</span><span className="mt-0.5 block text-xs text-slate-500">{assessment.module.programme.name}</span></td><td className="px-4 py-4 whitespace-nowrap text-slate-700">{assessment.deadline.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td><td className="px-4 py-4 text-slate-700"><span className="font-semibold tabular-nums">{assessment._count.submissions}</span><span className="text-slate-500"> submitted</span></td><td className="px-5 py-4">{assessment.closedAt ? <Badge variant="neutral">Closed</Badge> : <Badge variant="success">Open</Badge>}</td></tr>)}</tbody></table></div>
    </section> : <EmptyState icon={CalendarClock} title="No assessments yet" description="Create the first assessment after programme modules and fee rules are ready." action={<Button asChild><Link href="/staff/assessments/new"><Plus aria-hidden="true" className="size-4" />Create assessment</Link></Button>} />}
  </div>;
}
