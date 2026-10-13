import { ArrowRight, GraduationCap, Landmark, ShieldCheck, UsersRound } from "lucide-react";

import { signInAs } from "@/app/actions/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PersonaPicker() {
  const personas = await prisma.user.findMany({
    where: { isDemoPersona: true },
    include: { student: { select: { studentCode: true, programme: { select: { name: true } } } } },
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });
  const staff = personas.filter((person) => person.role === "REGISTRY_STAFF");
  const students = personas.filter((person) => person.role === "STUDENT");

  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_32rem),linear-gradient(180deg,_#f8fafc_0%,_#eef4ff_100%)] px-4 py-8 sm:px-6 lg:py-14">
    <div className="mx-auto max-w-6xl">
      <header className="flex flex-col gap-6 border-b border-slate-200/80 pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex max-w-2xl gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-700 text-white shadow-lg shadow-blue-900/15"><Landmark aria-hidden="true" className="size-5" /></span>
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-blue-700 uppercase">Student Management System</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Choose a demo workspace</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">Use one of the limited seeded accounts to examine the Registry workflows. Every page and mutation still checks role and student ownership on the server.</p>
          </div>
        </div>
        <Badge variant="default" className="self-start border-blue-200 bg-blue-50 px-3 py-1 text-blue-800">Assessment demo</Badge>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section aria-labelledby="demo-personas-heading">
          <h2 id="demo-personas-heading" className="sr-only">Available demo personas</h2>
          <div className="grid gap-6">
            <PersonaGroup icon={ShieldCheck} title="Registry team" description="Staff accounts manage enrolments, finance, assessments, and result visibility." personas={staff} />
            <PersonaGroup icon={GraduationCap} title="Student portal" description="Students can see only their own balance, assessments, submissions, and published results." personas={students} />
          </div>
        </section>

        <aside className="h-fit rounded-xl border border-blue-100 bg-white/80 p-5 shadow-sm backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><UsersRound aria-hidden="true" className="size-4 text-blue-700" />Demo access only</div>
          <p className="mt-2 text-sm leading-6 text-slate-600">No passwords are stored. The selected account receives an eight-hour httpOnly demo session.</p>
          <div className="mt-5 border-t border-slate-200 pt-4 text-xs leading-5 text-slate-500">
            <p className="font-semibold text-slate-700">What is protected</p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>Role-only staff operations</li>
              <li>Student ownership checks</li>
              <li>Database-backed audit records</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  </main>;
}

type Persona = Awaited<ReturnType<typeof prisma.user.findMany>>[number] & {
  student: { studentCode: string; programme: { name: string } } | null;
};

function PersonaGroup({
  icon: Icon,
  title,
  description,
  personas,
}: {
  icon: typeof ShieldCheck;
  title: string;
  description: string;
  personas: Persona[];
}) {
  return <section>
    <div className="mb-3 flex items-start gap-3">
      <span className="grid size-8 place-items-center rounded-lg bg-slate-200 text-slate-700"><Icon aria-hidden="true" className="size-4" /></span>
      <div><h2 className="text-base font-semibold text-slate-950">{title}</h2><p className="mt-0.5 text-sm text-slate-600">{description}</p></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      {personas.map((person) => {
        const destination = person.role === "REGISTRY_STAFF" ? "/staff/dashboard" : "/student/home";
        const detail = person.role === "REGISTRY_STAFF" ? "Registry Staff" : `${person.student?.studentCode} · ${person.student?.programme.name}`;
        const hint = person.role === "STUDENT" ? studentPersonaHints[person.student?.studentCode ?? ""] : undefined;
        return <Card key={person.id} className="group overflow-hidden transition-[box-shadow,border-color] hover:border-blue-300 hover:shadow-md">
          <CardContent className="p-0">
            <form action={signInAs} className="h-full">
              <input type="hidden" name="userId" value={person.id} />
              <input type="hidden" name="destination" value={destination} />
              <Button type="submit" variant="ghost" className="h-auto w-full justify-between rounded-none p-5 text-left hover:bg-blue-50/60">
                <span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-950">{person.name}</span><span className="mt-1 block truncate text-xs font-normal text-slate-500">{detail}</span>{hint ? <span className="mt-1 block text-xs font-normal text-blue-700">{hint}</span> : null}</span>
                <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" />
              </Button>
            </form>
          </CardContent>
        </Card>;
      })}
    </div>
  </section>;
}

const studentPersonaHints: Record<string, string> = {
  "SMS-2026-0002": "Withheld result — academic integrity review",
  "SMS-2026-0003": "Late submission — withdrawn student",
  "SMS-2026-0005": "Resubmission history and published result",
  "SMS-2026-0006": "Published result before assessment deadline",
  "SMS-2026-0001": "Published result",
  "SMS-2026-0004": "Closed assessment result",
  "SMS-2025-0001": "Historic completed-student result",
};
