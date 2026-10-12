"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  id?: string;
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  id = "confirm-dialog",
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      id={id}
      ref={dialogRef}
      aria-describedby={`${id}-description`}
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClose={onCancel}
      className="max-w-md rounded-xl border border-slate-200 bg-white p-0 text-slate-950 shadow-xl backdrop:bg-slate-950/40"
    >
      <div className="space-y-5 p-6">
        <div className="space-y-2">
          <h2 id={`${id}-title`} className="text-lg font-semibold">
            {title}
          </h2>
          <p id={`${id}-description`} className="text-sm leading-6 text-slate-600">
            {description}
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant={destructive ? "destructive" : "default"} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
