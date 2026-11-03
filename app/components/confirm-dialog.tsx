"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "./ui";

/**
 * Accessible confirm dialog built on the native <dialog> element:
 * showModal() gives a focus trap, inert background and Escape-to-close.
 * Initial focus goes to Cancel so a destructive action is never the default.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      cancelRef.current?.focus();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[min(92vw,440px)] rounded-[var(--radius-large)] border border-[var(--color-border)] bg-[var(--color-background)] p-0 text-[var(--color-text)] shadow-[var(--shadow-lg)] backdrop:bg-[color-mix(in_srgb,var(--color-text)_45%,transparent)]"
    >
      <div className="space-y-3 p-5">
        <h2 id={titleId} className="text-base font-semibold">
          {title}
        </h2>
        <div id={descId} className="text-sm text-[var(--color-muted)]">
          {description}
        </div>
        {error && (
          <p role="alert" className="text-sm font-medium text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-medium)] border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <Button onClick={onConfirm} disabled={busy} variant="danger">
            {busy ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
