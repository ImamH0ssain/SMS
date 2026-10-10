import { AlertTriangle, ArrowRight, ClipboardCheck, FilePenLine, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { overdueAccounts } from "@/features/finance/service";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";

export default async function StaffDashboard() {
  const [overdue, openAssessments, drafts, withheld] = await Promise.all([
    overdueAccounts(),
    prisma.assessment.count({ where: { closedAt: null } }),
    prisma.result.count({ where: { status: "DRAFT" } }),
    prisma.result.count({ where: { status: "WITHHELD" } }),
  ]);
  const workItems = [
    { label: "Overdue accounts", value: overdue.length, href: "/staff/students", icon: AlertTriangle, tone: "text-rose-700 bg-rose-50" },
    { label: "Open assessments", value: openAssessments, href: "/staff/assessments", icon: ClipboardCheck, tone: "text-blue-700 bg-blue-50" },
    { label: "Draft results", value: drafts, href: "/staff/results", icon: FilePenLine, tone: "text-amber-700 bg-amber-50" },
    { label: "Withheld results", value: withheld, href: "/staff/results", icon: ShieldAlert, tone: "text-violet-700 bg-violet-50" },
  ];

  return <div className="space-y-7">
    <PageHeader eyebrow="Registry work queue" title="Good morning, Registry" description="Prioritise overdue balances, assessment deadlines, and result publication decisions." />

    <section aria-label="Work queue counts" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {workItems.map(({ label, value, href, icon: Icon, tone }) => <Link key={label} href={href} className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
        <Card className="h-full transition-[border-color,box-shadow] group-hover:border-blue-300 group-hover:shadow-md">
          <CardContent className="flex items-start justify-between p-5">
            <div><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{value}</p></div>
            <span className={`grid size-10 place-items-center rounded-lg ${tone}`}><Icon aria-hidden="true" className="size-5" /></span>
          </CardContent>
        </Card>
      </Link>)}
    </section>

    <section aria-labelledby="overdue-accounts-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><h2 id="overdue-accounts-heading" className="text-base font-semibold text-slate-950">Overdue accounts</h2>{overdue.length ? <Badge variant="danger">Action required</Badge> : <Badge variant="success">Clear</Badge>}</div>
          <p className="mt-1 text-sm text-slate-600">Includes every enrolment status, so debt remains visible after a student leaves.</p>
        </div>
        <Link href="/staff/students" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline">View all students<ArrowRight aria-hidden="true" className="size-4" /></Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[46rem] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase"><tr><th scope="col" className="px-5 py-3">Student</th><th scope="col" className="px-4 py-3">Status</th><th scope="col" className="px-4 py-3">Balance</th><th scope="col" className="px-4 py-3">Due date</th><th scope="col" className="px-5 py-3">Days overdue</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {overdue.length ? overdue.map(({ student, balanceMinor, dueDate, daysOverdue }) => <tr key={student.id} className="transition-colors hover:bg-slate-50/80">
              <td className="px-5 py-4"><Link href={`/staff/students/${student.studentCode}`} className="font-semibold text-blue-700 hover:underline">{student.fullName}<span className="mt-0.5 block text-xs font-normal text-slate-500">{student.studentCode}</span></Link></td>
              <td className="px-4 py-4"><StatusBadge value={student.status} /></td>
              <td className="px-4 py-4 font-semibold tabular-nums text-slate-950">{formatMoney(balanceMinor)}</td>
              <td className="px-4 py-4 whitespace-nowrap text-slate-700">{dueDate.toLocaleDateString("en-GB")}</td>
              <td className="px-5 py-4"><Badge variant="danger">{daysOverdue} day{daysOverdue === 1 ? "" : "s"}</Badge></td>
            </tr>) : <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-600">No overdue accounts. Good work.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}
