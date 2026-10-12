"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";

import { FormErrorSummary } from "@/components/form-error-summary";
import { initialActionState, type ActionState } from "@/lib/action-state";

type Action = (previous: ActionState, formData: FormData) => Promise<ActionState>;

export function ActionForm({ action, children, className }: { action: Action; children: ReactNode; className?: string }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  return (
    <form action={formAction} className={className} aria-busy={pending}>
      <FormErrorSummary state={state} />
      {children}
      {state.ok && state.message ? <p role="status" className="mt-3 text-sm text-emerald-700">{state.message}</p> : null}
    </form>
  );
}
