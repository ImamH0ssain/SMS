import { Award, GraduationCap } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { publishedResultsForStudent } from "@/features/results/projections";
import { classifyGrade } from "@/features/results/rules";
import { requireStudent } from "@/lib/session";
import { formatDate } from "@/lib/clock";

export default async function StudentResultsPage() {
  const session = await requireStudent();
  const results = await publishedResultsForStudent(session.studentId);

  return <div className="space-y-6">
    <PageHeader eyebrow="My marksheet" title="Published results" description="Only results formally published by the Registry appear here. Draft and withheld results remain private." />
    {results.length ? <section aria-labelledby="results-table-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 id="results-table-heading" className="text-base font-semibold text-slate-950">Results</h2><p className="mt-1 text-sm text-slate-600">{results.length} published assessment result{results.length === 1 ? "" : "s"}</p></div><span className="grid size-9 place-items-center rounded-lg bg-violet-50 text-violet-700"><Award aria-hidden="true" className="size-4" /></span></div>
      <div className="overflow-x-auto"><table className="min-w-[45rem] w-full text-left text-sm"><thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase"><tr><th scope="col" className="px-5 py-3">Module</th><th scope="col" className="px-4 py-3">Assessment</th><th scope="col" className="px-4 py-3">Grade</th><th scope="col" className="px-4 py-3">Classification</th><th scope="col" className="px-5 py-3">Published</th></tr></thead><tbody className="divide-y divide-slate-100">{results.map((result) => <tr key={result.id} className="hover:bg-slate-50/80"><td className="px-5 py-4"><span className="font-semibold text-slate-950">{result.assessment.module.code}</span></td><td className="px-4 py-4 text-slate-700">{result.assessment.title}</td><td className="px-4 py-4"><span className="font-bold tabular-nums text-slate-950">{result.grade}</span><span className="text-slate-500">/100</span></td><td className="px-4 py-4"><ClassificationBadge grade={result.grade} /></td><td className="px-5 py-4 whitespace-nowrap text-slate-600">      {result.publishedAt ? formatDate(result.publishedAt) : "—"}</td></tr>)}</tbody></table></div>
    </section> : <EmptyState icon={GraduationCap} title="No published results yet" description="When the Registry formally publishes a result, it will appear here. Draft and withheld results are intentionally not shown." />}
  </div>;
}

function ClassificationBadge({ grade }: { grade: number }) {
  const classification = classifyGrade(grade);
  const variant = classification === "Distinction" ? "success" : classification === "Merit" ? "default" : classification === "Pass" ? "warning" : "danger";
  return <Badge variant={variant}>{classification}</Badge>;
}
