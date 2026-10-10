import { BookOpenCheck, CalendarClock, FileText, LockKeyhole, RotateCcw, Upload } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { SubmissionUploadForm } from "@/components/submission-upload-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { studentAssessments } from "@/features/assessments/service";
import { now } from "@/lib/clock";
import { requireStudent } from "@/lib/session";

export default async function StudentAssessmentsPage() {
  const session = await requireStudent();
  const assessments = await studentAssessments(session.studentId);
  const currentTime = now();

  return <div className="space-y-6">
    <PageHeader eyebrow="My work" title="Assessments" description="Upload a PDF or DOCX up to 4 MB. A first submission may be late while the assessment is open; replacement submissions close at the deadline." />

    {assessments.length ? <section aria-label="Your assessments" className="grid gap-4">{assessments.map((assessment) => {
      const submission = assessment.submissions[0];
      const revision = submission?.currentRevision;
      const resubmissionClosed = Boolean(submission && currentTime > assessment.deadline);
      const uploadDisabled = Boolean(assessment.closedAt) || resubmissionClosed;
      const state = assessment.closedAt ? "CLOSED" : revision?.isLate ? "LATE" : submission ? "SUBMITTED" : "OPEN";
      const dueDescription = assessment.deadline.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
      const note = assessment.closedAt
        ? "This assessment is closed. The Registry can still review any submission already recorded."
        : resubmissionClosed
          ? "The resubmission deadline has passed. Your recorded work remains visible to the Registry."
          : submission
            ? "You may replace this submission until the deadline. Each revision is retained for the Registry."
            : currentTime > assessment.deadline
              ? "The deadline has passed, but a first submission is still allowed while this assessment remains open. It will be marked late."
              : "Choose a file and submit it before the deadline for an on-time record.";
      return <Card key={assessment.id} className="overflow-hidden">
        <CardHeader className="gap-4 bg-slate-50/70 sm:flex-row sm:items-start sm:justify-between">
          <div><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant="neutral">{assessment.module.code}</Badge><StatusBadge value={state} /></div><CardTitle>{assessment.title}</CardTitle><CardDescription className="mt-1 flex items-center gap-1.5"><CalendarClock aria-hidden="true" className="size-3.5" />Deadline {dueDescription}</CardDescription></div>
          {submission ? <div className="flex items-center gap-2 text-sm text-slate-600"><RotateCcw aria-hidden="true" className="size-4" />Revision {revision?.revisionNumber ?? 0}</div> : null}
        </CardHeader>
        <CardContent className="space-y-4 py-5">
          <div className={`rounded-lg border p-3 text-sm leading-5 ${uploadDisabled ? "border-slate-200 bg-slate-50 text-slate-600" : currentTime > assessment.deadline ? "border-amber-200 bg-amber-50 text-amber-950" : "border-blue-100 bg-blue-50/50 text-slate-700"}`}>
            <span className="mr-2 inline-flex align-middle">{uploadDisabled ? <LockKeyhole aria-hidden="true" className="size-4" /> : <Upload aria-hidden="true" className="size-4" />}</span>{note}
          </div>
          {revision ? <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-2"><FileText aria-hidden="true" className="size-4 shrink-0 text-slate-400" /><span className="truncate font-medium text-slate-800">{revision.fileName}</span></div><span className="shrink-0 text-xs text-slate-500">Submitted {revision.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</span></div> : null}
          <SubmissionUploadForm assessmentId={assessment.id} isResubmission={Boolean(submission)} disabled={uploadDisabled} />
        </CardContent>
      </Card>;
    })}</section> : <EmptyState icon={BookOpenCheck} title="No assessments are available" description="When the Registry creates an assessment for your programme and academic year, it will appear here." />}
  </div>;
}
