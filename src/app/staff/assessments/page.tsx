import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function AssessmentsPage() {
  const assessments = await prisma.assessment.findMany({ include: { module: { include: { programme: true } } }, orderBy: { deadline: "asc" } });
  return <><div className="toolbar"><div><div className="eyebrow">Assessment submission</div><h1>Assessments</h1></div><Link className="button" href="/staff/assessments/new">Create assessment</Link></div><section className="card table-wrap"><table className="table"><thead><tr><th>Assessment</th><th>Module</th><th>Deadline</th><th>Submission state</th></tr></thead><tbody>{assessments.map((assessment) => <tr key={assessment.id}><td><Link href={`/staff/assessments/${assessment.id}`} style={{ color: "var(--blue)", fontWeight: 700 }}>{assessment.title}</Link></td><td>{assessment.module.code}<br /><small>{assessment.module.programme.name}</small></td><td>{assessment.deadline.toLocaleString("en-GB")}</td><td>{assessment.closedAt ? "Closed" : "Open"}</td></tr>)}</tbody></table></section></>;
}
