"use client";

import { AlertTriangle, Save } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState, type ActionState } from "@/lib/action-state";

type ResultStatus = "DRAFT" | "WITHHELD" | "PUBLISHED";

type ResultUpdateFormProps = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  studentId: string;
  assessmentId: string;
  grade?: number;
  status?: ResultStatus;
  version?: number;
  withheldReason?: string | null;
  hasOverdueBalance?: boolean;
};

export function ResultUpdateForm({ action, studentId, assessmentId, grade, status, version = 0, withheldReason, hasOverdueBalance = false }: ResultUpdateFormProps) {
  const currentStatus = status;
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction] = useActionState(action, initialActionState);
  const [nextStatus, setNextStatus] = useState<ResultStatus>(status ?? "DRAFT");
  const [confirming, setConfirming] = useState(false);
  const mustWithhold = currentStatus === "PUBLISHED";
  const options: ResultStatus[] = currentStatus === "PUBLISHED"
    ? ["WITHHELD"]
    : currentStatus === "WITHHELD"
      ? ["WITHHELD", "PUBLISHED"]
      : ["DRAFT", "WITHHELD", "PUBLISHED"];
  const requireReason = nextStatus === "WITHHELD";

  const requiresConfirmation = nextStatus === "PUBLISHED" || (currentStatus === "PUBLISHED" && nextStatus === "WITHHELD");
  const confirmationTitle = nextStatus === "PUBLISHED" ? "Publish this result?" : "Withhold this published result?";
  const confirmationDescription = nextStatus === "PUBLISHED"
    ? hasOverdueBalance
      ? "The student has overdue fees. The explicit debt override will be recorded with this publication."
      : "The student will be able to see this result immediately."
    : "This result will no longer be visible to the student.";

  return <>
  <form ref={formRef} action={formAction} className="grid min-w-[16rem] gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
    <input type="hidden" name="studentId" value={studentId} />
    <input type="hidden" name="assessmentId" value={assessmentId} />
    <input type="hidden" name="version" value={version} />
    <div className="grid grid-cols-[6rem_minmax(0,1fr)] items-end gap-2"><div className="grid gap-1"><Label htmlFor={`grade-${studentId}`} className="text-xs">Grade</Label><Input id={`grade-${studentId}`} name="grade" type="number" min="0" max="100" defaultValue={grade} placeholder="0–100" required readOnly={mustWithhold} className={mustWithhold ? "bg-slate-100" : ""} /></div><div className="grid gap-1"><Label htmlFor={`status-${studentId}`} className="text-xs">Outcome</Label><select id={`status-${studentId}`} name="status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as ResultStatus)} className="h-10 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15">{options.map((option) => <option key={option} value={option}>{option === "DRAFT" ? "Save draft" : option === "WITHHELD" ? "Withhold" : "Publish"}</option>)}</select></div></div>
    {mustWithhold ? <p className="text-xs leading-4 text-amber-800">Withhold the published result first. You can edit and republish it afterwards.</p> : null}
    {requireReason ? <div className="grid gap-1"><Label htmlFor={`reason-${studentId}`} className="text-xs">Withhold reason</Label><Input id={`reason-${studentId}`} name="withheldReason" defaultValue={withheldReason ?? ""} required placeholder="Reason visible in the audit record" /></div> : <input type="hidden" name="withheldReason" value="" />}
    {nextStatus === "PUBLISHED" && hasOverdueBalance ? <label className="flex cursor-pointer items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs leading-4 text-amber-950"><input className="mt-0.5" type="checkbox" name="overrideOverdue" value="true" required /><span><AlertTriangle aria-hidden="true" className="mr-1 inline size-3.5" />I confirm publication despite the overdue fee balance.</span></label> : null}
    <Button type={requiresConfirmation ? "button" : "submit"} onClick={() => requiresConfirmation && setConfirming(true)} variant={nextStatus === "PUBLISHED" ? "default" : nextStatus === "WITHHELD" ? "destructive" : "secondary"} size="sm" className="w-full"><Save aria-hidden="true" className="size-3.5" />{nextStatus === "PUBLISHED" ? "Publish result" : nextStatus === "WITHHELD" ? "Withhold result" : "Save draft"}</Button>
    {state.message ? <p role={state.ok ? "status" : "alert"} className={`text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
  </form>
  <ConfirmDialog
    id={`result-confirm-${studentId}`}
    open={confirming}
    title={confirmationTitle}
    description={confirmationDescription}
    confirmLabel={nextStatus === "PUBLISHED" ? "Publish result" : "Withhold result"}
    destructive={nextStatus === "WITHHELD"}
    onCancel={() => setConfirming(false)}
    onConfirm={() => {
      setConfirming(false);
      formRef.current?.requestSubmit();
    }}
  />
  </>;
}
