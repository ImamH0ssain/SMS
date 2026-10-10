import Link from "next/link";
import { notFound } from "next/navigation";
import { updateStudentAction } from "@/app/actions/students";
import { prisma } from "@/lib/prisma";

export default async function EditStudentPage({ params }: { params: Promise<{ studentCode: string }> }) {
  const { studentCode } = await params;
  const [student, programmes] = await Promise.all([prisma.student.findUnique({ where: { studentCode } }), prisma.programme.findMany({ where: { isActive: true } })]);
  if (!student) notFound();
  return <><Link href={`/staff/students/${studentCode}`} style={{ color: "var(--blue)", fontWeight: 700 }}>← Back to record</Link><div className="eyebrow" style={{ marginTop: 22 }}>Student management</div><h1>Edit {student.fullName}</h1><form action={updateStudentAction} className="card form-card"><input type="hidden" name="studentId" value={student.id}/><div className="grid grid-2"><div className="field"><label>Full name</label><input name="fullName" defaultValue={student.fullName} required/></div><div className="field"><label>Email</label><input name="email" type="email" defaultValue={student.email} required/></div><div className="field"><label>Programme</label><select name="programmeId" defaultValue={student.programmeId}>{programmes.map((p) => <option value={p.id} key={p.id}>{p.name}</option>)}</select></div><div className="field"><label>Academic year</label><input name="academicYear" defaultValue={student.academicYear} required/></div><div className="field"><label>Enrolment status</label><select name="status" defaultValue={student.status}><option value="ENROLLED">Enrolled</option><option value="DEFERRED">Deferred</option><option value="WITHDRAWN">Withdrawn</option><option value="COMPLETED">Completed</option></select></div></div><div className="field"><label>Status reason (required for deferred/withdrawn)</label><textarea name="statusReason" defaultValue={student.statusReason ?? ""}/></div><button className="button">Save changes</button></form></>;
}
