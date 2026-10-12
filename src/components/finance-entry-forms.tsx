"use client";

import { useActionState } from "react";

import { createAdjustmentAction, recordPaymentAction } from "@/app/actions/finance";
import { FormErrorSummary } from "@/components/form-error-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";

export function FinanceEntryForms({ studentId, studentCode }: { studentId: string; studentCode: string }) {
  const [paymentState, paymentAction, paymentPending] = useActionState(recordPaymentAction, initialActionState);
  const [adjustmentState, adjustmentAction, adjustmentPending] = useActionState(createAdjustmentAction, initialActionState);

  return (
    <>
      <Card>
        <CardHeader><CardTitle>Record payment</CardTitle><CardDescription>Payments are immutable ledger entries. Amounts cannot exceed the outstanding balance.</CardDescription></CardHeader>
        <CardContent>
          <form action={paymentAction} className="grid gap-4 sm:grid-cols-3 sm:items-end">
            <input type="hidden" name="studentId" value={studentId} /><input type="hidden" name="studentCode" value={studentCode} />
            <div className="grid gap-2"><Label htmlFor="amount">Amount (£)</Label><Input id="amount" name="amount" inputMode="decimal" placeholder="250.00" required aria-describedby="payment-feedback" /></div>
            <div className="grid gap-2"><Label htmlFor="receivedOn">Received on</Label><Input id="receivedOn" name="receivedOn" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
            <div className="grid gap-2"><Label htmlFor="reference">Reference</Label><Input id="reference" name="reference" required placeholder="Receipt or bank reference" /></div>
            <div id="payment-feedback" className="sm:col-span-3"><FormErrorSummary state={paymentState} /></div>
            <Button type="submit" disabled={paymentPending} className="sm:col-span-3 sm:w-fit">{paymentPending ? "Recording..." : "Record payment"}</Button>
          </form>
          {paymentState.ok ? <p role="status" className="mt-3 text-sm text-emerald-700">{paymentState.message}</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Record fee adjustment</CardTitle><CardDescription>Use a positive amount to increase the balance or a negative amount to reduce it. Adjustments cannot make the balance negative.</CardDescription></CardHeader>
        <CardContent>
          <form action={adjustmentAction} className="grid gap-4 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-end">
            <input type="hidden" name="studentId" value={studentId} /><input type="hidden" name="studentCode" value={studentCode} />
            <div className="grid gap-2"><Label htmlFor="adjustmentAmount">Signed amount (£)</Label><Input id="adjustmentAmount" name="amount" inputMode="decimal" placeholder="-50.00 or 50.00" required aria-describedby="adjustment-feedback" /></div>
            <div className="grid gap-2"><Label htmlFor="adjustmentReason">Reason</Label><Input id="adjustmentReason" name="reason" maxLength={500} required /></div>
            <div id="adjustment-feedback"><FormErrorSummary state={adjustmentState} /></div>
            <Button type="submit" disabled={adjustmentPending}>{adjustmentPending ? "Recording..." : "Record adjustment"}</Button>
          </form>
          {adjustmentState.ok ? <p role="status" className="mt-3 text-sm text-emerald-700">{adjustmentState.message}</p> : null}
        </CardContent>
      </Card>
    </>
  );
}
