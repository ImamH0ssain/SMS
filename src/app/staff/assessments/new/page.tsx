import Link from "next/link";
import { createAssessmentAction } from "@/app/actions/assessments";
import { prisma } from "@/lib/prisma";

export default async function NewAssessmentPage() {
  const modules = await prisma.module.findMany({ include: { programme: true }, orderBy: { code: "asc" } });
  return <><Link href="/staff/assessments" style={{ color: "var(--blue)", fontWeight: 700 }}>← Back to assessments</Link><div className="eyebrow" style={{ marginTop: 22 }}>Assessment setup</div><h1>Create assessment</h1><form action={createAssessmentAction} className="card form-card"><div className="field"><label>Title</label><input name="title" required/></div><div className="field"><label>Module</label><select name="moduleId" required>{modules.map((module) => <option value={module.id} key={module.id}>{module.code} — {module.name} ({module.programme.code})</option>)}</select></div><div className="grid grid-2"><div className="field"><label>Academic year</label><input name="academicYear" defaultValue="2026/27" required/></div><div className="field"><label>Submission deadline</label><input name="deadline" type="datetime-local" required/></div></div><button className="button">Create assessment</button></form></>;
}
