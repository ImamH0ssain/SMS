"use client";

import { useEffect, useRef } from "react";

import type { ActionState } from "@/lib/action-state";

export function FormErrorSummary({ state }: { state: ActionState }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!state.ok && state.message) ref.current?.focus();
  }, [state]);

  if (state.ok || !state.message) return null;

  return (
    <div ref={ref} tabIndex={-1} role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 focus:outline-none focus:ring-2 focus:ring-red-600">
      <p className="font-semibold">{state.message}</p>
      {state.fieldErrors ? (
        <ul className="mt-2 list-disc space-y-1 pl-5">
          {Object.entries(state.fieldErrors).flatMap(([field, messages]) =>
            messages.map((message) => <li key={`${field}-${message}`}>{message}</li>),
          )}
        </ul>
      ) : null}
    </div>
  );
}
