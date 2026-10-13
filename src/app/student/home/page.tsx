import { AlertTriangle, ArrowRight, Award, BookOpenCheck, CalendarDays, WalletCards } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { studentAssessments } from "@/features/assessments/service";
import { balanceForAssignment } from "@/features/finance/service";
import { isOverdue } from "@/features/finance/rules";
import { organisationDate } from "@/lib/clock";
import { formatDate } from "@/lib/clock";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/session";

export default async function StudentHomePage() {
  const session = await requireStudent();
  const student = await prisma.student.findUniqueOrThrow({ where: { id: session.studentId }, include: { feeAssignment: true } });
  const [assessments, published] = await Promise.all([studentAssessments(student.id), prisma.result.count({ where: { studentId: student.id, status: "PUBLISHED" } })]);
  const finance = student.feeAssignment ? await balanceForAssignment(student.feeAssignment.id) : null;
  const overdue = finance ? isOverdue(finance.balanceMinor, finance.assignment.dueDate, organisationDate()) : false;
  const openAssessments = assessments.filter((assessment) => !assessment.closedAt).length;
  const cards = [
    { label: "Current balance", value: finance ? formatMoney(finance.balanceMinor) : "—", icon: WalletCards, tone: overdue ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700", href: "/student/home" },
    { label: "Fee due date", value: finance ? formatDate(finance.assignment.dueDate) : "—", icon: CalendarDays, tone: "bg-slate-100 text-slate-700", href: "/student/home" },
    { label: "Open assessments", value: String(openAssessments), icon: BookOpenCheck, tone: "bg-emerald-50 text-emerald-700", href: "/student/assessments" },
    { label: "Published results", value: String(published), icon: Award, tone: "bg-violet-50 text-violet-700", href: "/student/results" },
  ];

  return <div className="space-y-7">
    <PageHeader eyebrow="Student home" title={`Welcome, ${student.fullName.split(" ")[0]}`} description="Keep track of your balance, submission deadlines, and published marks." />
    {overdue ? <div role="alert" className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><AlertTriangle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700" /><div><p className="font-semibold">Your account has an overdue balance</p><p className="mt-1 text-sm leading-5 text-amber-900">Contact the Registry if you need help. This does not hide your work, but staff will see the outstanding balance when they publish results.</p></div></div> : null}

    <section aria-label="Your summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ label, value, icon: Icon, tone, href }) => <Link key={label} href={href} className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-600"><Card className="h-full transition-[border-color,box-shadow] group-hover:border-blue-300 group-hover:shadow-md"><CardContent className="flex items-start justify-between p-5"><div><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-xl font-bold tracking-tight text-slate-950">{value}</p></div><span className={`grid size-10 place-items-center rounded-lg ${tone}`}><Icon aria-hidden="true" className="size-5" /></span></CardContent></Card></Link>)}
    </section>

    <Card className="overflow-hidden">
      <CardHeader className="bg-slate-50/70"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><CardTitle>Your next action</CardTitle><CardDescription className="mt-1">Review deadlines and submit work from your assessments page. Only formally published marks appear in your results.</CardDescription></div>{openAssessments ? <Badge variant="default">{openAssessments} open</Badge> : <Badge variant="neutral">No open work</Badge>}</div></CardHeader>
      <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-sm leading-6 text-slate-600">First submissions are accepted while an assessment remains open, including after the deadline. Resubmissions must be made by the deadline.</p><div className="flex shrink-0 flex-wrap gap-2"><Button asChild><Link href="/student/assessments">My assessments<ArrowRight aria-hidden="true" className="size-4" /></Link></Button><Button asChild variant="outline"><Link href="/student/results">My results</Link></Button></div></CardContent>
    </Card>
  </div>;
}
