"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Props = { initialStatus: string; initialReason: string };

export function StudentStatusFields({ initialStatus, initialReason }: Props) {
  const [status, setStatus] = useState(initialStatus);
  const requiresReason = status === "DEFERRED" || status === "WITHDRAWN";
  return <>
    <div className="grid gap-2">
      <Label htmlFor="status">Enrolment status</Label>
      <select id="status" name="status" value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15">
        <option value="ENROLLED">Enrolled</option><option value="DEFERRED">Deferred</option><option value="WITHDRAWN">Withdrawn</option><option value="COMPLETED">Completed</option>
      </select>
    </div>
    <div className="grid gap-2 sm:col-span-2">
      <Label htmlFor="statusReason">Status-transition reason {requiresReason ? <span className="text-rose-700">(required)</span> : null}</Label>
      <Textarea id="statusReason" name="statusReason" defaultValue={initialReason} maxLength={500} required={requiresReason} aria-describedby="statusReason-help" placeholder="Required when deferring or withdrawing; max 500 characters." />
      <p id="statusReason-help" className="text-xs text-slate-500">The server validates this requirement for the selected status.</p>
    </div>
  </>;
}
