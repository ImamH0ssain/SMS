"use client";

import { LoaderCircle, Paperclip, Upload } from "lucide-react";
import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type SubmissionUploadFormProps = {
  assessmentId: string;
  isResubmission: boolean;
  disabled: boolean;
};

type ApiFailure = { error?: { message?: string } };

export function SubmissionUploadForm({ assessmentId, isResubmission, disabled }: SubmissionUploadFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Choose a PDF or DOCX file before uploading.");
      setMessage(null);
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/assessments/${assessmentId}/submissions`, { method: "POST", body: new FormData(form) });
      const body = await response.json().catch(() => null) as ApiFailure | null;
      if (!response.ok) throw new Error(body?.error?.message || "The submission could not be saved. Please try again.");
      form.reset();
      setMessage(isResubmission ? "Your replacement submission was saved." : "Your submission was saved.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The submission could not be saved. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-center">
    <label className="group flex min-h-10 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-3 text-sm text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50/40 has-[:focus-visible]:border-blue-600 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600/15 has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-slate-50 has-[:disabled]:opacity-60">
      <Paperclip aria-hidden="true" className="size-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
      <span className="truncate">Choose PDF or DOCX (max 4 MB)</span>
      <input ref={inputRef} name="file" type="file" required disabled={disabled || pending} accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="sr-only" />
    </label>
    <Button type="submit" disabled={disabled || pending} className="sm:min-w-40">
      {pending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Upload aria-hidden="true" className="size-4" />}
      {pending ? "Uploading…" : isResubmission ? "Resubmit work" : "Upload submission"}
    </Button>
    <p aria-live="polite" className="sr-only">{error || message}</p>
    {error ? <p role="alert" className="basis-full text-sm text-rose-700">{error}</p> : null}
    {message ? <p className="basis-full text-sm text-emerald-700">{message}</p> : null}
  </form>;
}
