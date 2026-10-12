import { ArrowLeft, CircleAlert, UserPlus } from "lucide-react";
import Link from "next/link";

import { enrolStudentAction } from "@/app/actions/students";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export default async function NewStudentPage() {
  await requireStaff();
  const programmes = await prisma.programme.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
  return <div className="mx-auto max-w-3xl space-y-6">
    <Link href="/staff/students" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to students</Link>
    <PageHeader eyebrow="Student enrolment" title="Enrol a student" description="A unique Student ID and immutable fee snapshot are created in one transaction after the programme has a fee rule for the academic year." />
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserPlus aria-hidden="true" className="size-5 text-blue-700" />Student details</CardTitle></CardHeader><CardContent><ActionForm action={enrolStudentAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" required autoComplete="name" /></div><div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div><div className="grid gap-2"><Label htmlFor="dateOfBirth">Date of birth</Label><Input id="dateOfBirth" name="dateOfBirth" type="date" required /></div><div className="grid gap-2"><Label htmlFor="academicYear">Academic year</Label><Input id="academicYear" name="academicYear" defaultValue="2026/27" pattern="\d{4}/\d{2}" placeholder="YYYY/YY" required /></div></div>
      <div className="grid gap-2"><Label htmlFor="programmeId">Programme</Label><select id="programmeId" name="programmeId" required defaultValue="" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15"><option value="" disabled>Select a programme</option>{programmes.map((programme) => <option value={programme.id} key={programme.id}>{programme.code} — {programme.name}</option>)}</select>{programmes.length === 0 ? <p className="text-sm text-rose-700">Configure a programme and fee rule before enrolling a student.</p> : null}</div>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-5 text-slate-700"><input className="mt-0.5" type="checkbox" name="confirmPossibleDuplicate" value="true" /><span><span className="font-medium">Duplicate check acknowledgement</span><br />I have reviewed whether an existing record uses the same name and date of birth.</span></label>
      <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-sm leading-5 text-slate-700"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-blue-700" /><p>The Registry validates the programme fee rule before issuing the Student ID. A missing fee rule or detected duplicate stops enrolment without creating a partial record.</p></div>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5"><Button type="submit" disabled={programmes.length === 0}>Create student record</Button><Button asChild variant="outline"><Link href="/staff/students">Cancel</Link></Button></div>
    </ActionForm></CardContent></Card>
  </div>;
}
