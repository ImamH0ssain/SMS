"use client";

import { Ban } from "lucide-react";
import { useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { initialActionState, type ActionState } from "@/lib/action-state";

type VoidPaymentFormProps = {
  action: (previous: ActionState, formData: FormData) => Promise<ActionState>;
  paymentId: string;
  studentCode: string;
};

export function VoidPaymentForm({ action, paymentId, studentCode }: VoidPaymentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useActionState(action, initialActionState);

  return <>
    <form ref={formRef} action={formAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input type="hidden" name="studentCode" value={studentCode} />
      <Input name="reason" required placeholder="Reason to void" aria-label="Reason to void payment" className="h-8 text-xs" />
      <Button type="button" variant="ghost" size="sm" className="shrink-0 text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => {
        if (formRef.current?.reportValidity()) setConfirming(true);
      }}><Ban aria-hidden="true" className="size-3.5" />Void</Button>
    </form>
    {state.message ? <p role={state.ok ? "status" : "alert"} className={`mt-2 text-xs ${state.ok ? "text-emerald-700" : "text-rose-700"}`}>{state.message}</p> : null}
    <ConfirmDialog
      open={confirming}
      title="Void this payment?"
      description="This action is audit-recorded and the student's balance will be recalculated."
      confirmLabel="Void payment"
      destructive
      onCancel={() => setConfirming(false)}
      onConfirm={() => {
        setConfirming(false);
        formRef.current?.requestSubmit();
      }}
    />
  </>;
}
