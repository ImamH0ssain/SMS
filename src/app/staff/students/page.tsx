import { ChevronLeft, ChevronRight, Filter, Plus, Search, Settings2, UsersRound } from "lucide-react";
import Link from "next/link";

import { EnrolmentStatus, Prisma } from "@/generated/prisma/client";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";

export default async function StudentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "";
  const programmeId = typeof params.programmeId === "string" ? params.programmeId : "";
  const academicYear = typeof params.academicYear === "string" ? params.academicYear : "";
  const requestedPage = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 20;
  const where: Prisma.StudentWhereInput = {
    ...(query ? { OR: [{ fullName: { contains: query, mode: "insensitive" } }, { studentCode: { startsWith: query, mode: "insensitive" } }] } : {}),
    ...(status ? { status: status as EnrolmentStatus } : {}),
    ...(programmeId ? { programmeId } : {}),
    ...(academicYear ? { academicYear } : {}),
  };
  const [students, total, programmes, years] = await Promise.all([
    prisma.student.findMany({ where, include: { programme: true }, skip: (page - 1) * pageSize, take: pageSize, orderBy: [{ fullName: "asc" }, { studentCode: "asc" }] }),
    prisma.student.count({ where }),
    prisma.programme.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.student.findMany({ distinct: ["academicYear"], select: { academicYear: true }, orderBy: { academicYear: "desc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const pageHref = (target: number) => {
    const values = new URLSearchParams();
    if (query) values.set("q", query);
    if (status) values.set("status", status);
    if (programmeId) values.set("programmeId", programmeId);
    if (academicYear) values.set("academicYear", academicYear);
    values.set("page", String(target));
    return `/staff/students?${values.toString()}`;
  };

  return <div className="space-y-6">
    <PageHeader eyebrow="Student records" title="Students" description="Find a student record, review its current status, or start a controlled enrolment." actions={<Button asChild><Link href="/staff/students/new"><Plus aria-hidden="true" className="size-4" />Add student</Link></Button>} />

    <Card>
      <CardContent className="p-5">
        <form method="get" className="grid gap-4 lg:grid-cols-[minmax(14rem,1fr)_11rem_9rem_10rem_auto] lg:items-end">
          <div className="grid gap-2"><Label htmlFor="q">Search name or Student ID</Label><div className="relative"><Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" /><Input id="q" name="q" defaultValue={query} placeholder="e.g. Amina or SMS-2026" className="pl-9" /></div></div>
          <div className="grid gap-2"><Label htmlFor="programmeId">Programme</Label><select id="programmeId" name="programmeId" defaultValue={programmeId} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"><option value="">All programmes</option>{programmes.map((programme) => <option value={programme.id} key={programme.id}>{programme.code}</option>)}</select></div>
          <div className="grid gap-2"><Label htmlFor="academicYear">Academic year</Label><select id="academicYear" name="academicYear" defaultValue={academicYear} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"><option value="">All years</option>{years.map(({ academicYear: year }) => <option value={year} key={year}>{year}</option>)}</select></div>
          <div className="grid gap-2"><Label htmlFor="status">Status</Label><select id="status" name="status" defaultValue={status} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"><option value="">All statuses</option><option value="ENROLLED">Enrolled</option><option value="DEFERRED">Deferred</option><option value="WITHDRAWN">Withdrawn</option><option value="COMPLETED">Completed</option></select></div>
          <Button type="submit" variant="secondary"><Filter aria-hidden="true" className="size-4" />Apply</Button>
        </form>
      </CardContent>
    </Card>

    <section aria-labelledby="student-list-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4"><div><h2 id="student-list-heading" className="text-base font-semibold text-slate-950">Student list</h2><p className="mt-1 text-sm text-slate-600">{total} matching record{total === 1 ? "" : "s"}</p></div><span className="hidden size-9 place-items-center rounded-lg bg-slate-100 text-slate-600 sm:grid"><UsersRound aria-hidden="true" className="size-4" /></span></div>
      <div className="overflow-x-auto">
        <table className="min-w-[52rem] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold tracking-wide text-slate-500 uppercase"><tr><th scope="col" className="px-5 py-3">Student</th><th scope="col" className="px-4 py-3">Programme</th><th scope="col" className="px-4 py-3">Academic year</th><th scope="col" className="px-5 py-3">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {students.length ? students.map((student) => <tr key={student.id} className="transition-colors hover:bg-slate-50/80"><td className="px-5 py-4"><Link href={`/staff/students/${student.studentCode}`} className="font-semibold text-blue-700 hover:underline">{student.fullName}<span className="mt-0.5 block text-xs font-normal text-slate-500">{student.studentCode} · {student.email}</span></Link></td><td className="px-4 py-4 text-slate-700">{student.programme.name}</td><td className="px-4 py-4 text-slate-700">{student.academicYear}</td><td className="px-5 py-4"><StatusBadge value={student.status} /></td></tr>) : <tr><td colSpan={4} className="px-5 py-14 text-center"><UsersRound aria-hidden="true" className="mx-auto mb-3 size-5 text-slate-400" /><p className="font-medium text-slate-800">No students match these filters.</p><p className="mt-1 text-sm text-slate-500">Change the filters or clear the search to see more records.</p></td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"><p className="text-slate-600">Showing {students.length ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total} record{total === 1 ? "" : "s"}.</p><div className="flex items-center gap-2">{page > 1 ? <Button asChild variant="outline" size="sm"><Link href={pageHref(page - 1)}><ChevronLeft aria-hidden="true" className="size-4" />Previous</Link></Button> : <Button disabled variant="outline" size="sm"><ChevronLeft aria-hidden="true" className="size-4" />Previous</Button>}<span className="px-1 text-xs font-medium text-slate-500">Page {page} of {pages}</span>{page < pages ? <Button asChild variant="outline" size="sm"><Link href={pageHref(page + 1)}>Next<ChevronRight aria-hidden="true" className="size-4" /></Link></Button> : <Button disabled variant="outline" size="sm">Next<ChevronRight aria-hidden="true" className="size-4" /></Button>}</div></div>
    </section>

    <p className="flex items-center gap-2 text-sm text-slate-600"><Settings2 aria-hidden="true" className="size-4 text-slate-400" />Need to change the catalogue? <Link href="/staff/settings/programmes" className="font-semibold text-blue-700 hover:underline">Manage programmes and fee rules</Link>.</p>
  </div>;
}
