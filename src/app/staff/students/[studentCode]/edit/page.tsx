import { ArrowLeft, CircleAlert, PencilLine } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { updateStudentAction } from "@/app/actions/students";
import { PageHeader } from "@/components/page-header";
import { ActionForm } from "@/components/action-form";
import { StudentStatusFields } from "@/components/student-status-fields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/session";

export default async function EditStudentPage({ params }: { params: Promise<{ studentCode: string }> }) {
  await requireStaff();
  const { studentCode } = await params;
  const [student, programmes] = await Promise.all([prisma.student.findUnique({ where: { studentCode } }), prisma.programme.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })]);
  if (!student) notFound();
  return <div className="mx-auto max-w-3xl space-y-6"><Link href={`/staff/students/${studentCode}`} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:underline"><ArrowLeft aria-hidden="true" className="size-4" />Back to record</Link><PageHeader eyebrow="Student management" title={`Edit ${student.fullName}`} description="Status transitions require a reason where required. Programme and academic-year changes may only happen before any finance or academic activity." /><Card><CardHeader><CardTitle className="flex items-center gap-2"><PencilLine aria-hidden="true" className="size-5 text-blue-700" />Record details</CardTitle></CardHeader><CardContent><ActionForm action={updateStudentAction} className="space-y-5"><input type="hidden" name="studentId" value={student.id} /><div className="grid gap-5 sm:grid-cols-2"><div className="grid gap-2"><Label htmlFor="studentCode">Student ID</Label><Input id="studentCode" value={student.studentCode} readOnly aria-readonly="true" /></div><div className="grid gap-2"><Label htmlFor="dateOfBirth">Date of birth</Label><Input id="dateOfBirth" value={student.dateOfBirth.toISOString().slice(0, 10)} readOnly aria-readonly="true" /></div><div className="grid gap-2"><Label htmlFor="fullName">Full name</Label><Input id="fullName" name="fullName" defaultValue={student.fullName} required /></div><div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" defaultValue={student.email} required /></div><div className="grid gap-2"><Label htmlFor="programmeId">Programme</Label><select id="programmeId" name="programmeId" defaultValue={student.programmeId} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15">{programmes.map((programme) => <option value={programme.id} key={programme.id}>{programme.name}</option>)}</select></div><div className="grid gap-2"><Label htmlFor="academicYear">Academic year</Label><Input id="academicYear" name="academicYear" defaultValue={student.academicYear} pattern="\d{4}/\d{2}" required /></div>  <StudentStatusFields initialStatus={student.status} initialReason={student.statusReason ?? ""} /></div><div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-950"><CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700" /><p>Withdrawn and completed statuses are terminal. A programme or year change creates a new fee snapshot only when there are no payments, adjustments, submissions, or results.</p></div><div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5"><Button type="submit">Save changes</Button><Button asChild variant="outline"><Link href={`/staff/students/${studentCode}`}>Cancel</Link></Button></div></ActionForm></CardContent></Card></div>;
}
