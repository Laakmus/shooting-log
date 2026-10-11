import { type ReactNode, useEffect, useId, useRef } from "react";
import { Button } from "./Button";
import { FormError } from "./FormError";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  /** 400px instead of 500px wide. */
  narrow?: boolean;
  /** A save is in progress: the window cannot be closed and all its controls are disabled. */
  busy?: boolean;
  hideClose?: boolean;
  children: ReactNode;
}

/** Centered window. Closes with the ✕ button, Escape or a click on the backdrop, unless `busy`. */
export function Modal({ open, onClose, title, subtitle, narrow, busy = false, hideClose, children }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, busy, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-[rgba(28,25,23,0.5)] px-5 py-10"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`relative w-full animate-modal-in rounded-xl bg-card shadow-modal outline-none ${narrow ? "max-w-[400px]" : "max-w-[500px]"}`}
      >
        {/* A disabled fieldset disables every control inside the window at once. */}
        <fieldset disabled={busy} className="m-0 min-w-0 border-0 p-0">
          {!hideClose && (
            <button
              type="button"
              aria-label="Zamknij"
              onClick={onClose}
              className="absolute top-[13px] right-[14px] z-[3] h-7 w-7 cursor-pointer rounded-[7px] border border-line bg-card text-[13px] text-muted enabled:hover:border-accent enabled:hover:text-accent disabled:cursor-default disabled:opacity-55"
            >
              ✕
            </button>
          )}
          {title && (
            <div className="border-b border-line px-5 pt-[18px] pb-4">
              <h2 id={titleId} className="m-0 pr-9 text-base font-[620]">
                {title}
              </h2>
              {subtitle && <p className="mt-[3px] mb-0 text-[12.5px] text-muted">{subtitle}</p>}
            </div>
          )}
          {children}
        </fieldset>
      </div>
    </div>
  );
}

/** Padded content area of a window. */
export function ModalBody({ children }: { children: ReactNode }) {
  return <div className="px-5 pt-4 pb-5">{children}</div>;
}

interface ModalActionsProps {
  onCancel: () => void;
  onSubmit?: () => void;
  submitLabel: string;
  busy?: boolean;
  error?: string | null;
  danger?: boolean;
  /** Use "submit" when the actions sit inside a <form>. */
  submitType?: "button" | "submit";
}

/** Footer of a window: optional error message, then "Anuluj" and the main action. */
export function ModalActions({
  onCancel,
  onSubmit,
  submitLabel,
  busy = false,
  error,
  danger,
  submitType = "button",
}: ModalActionsProps) {
  return (
    <div className="mt-5">
      <FormError message={error} />
      <div className="flex justify-end gap-[9px] border-t border-line pt-4">
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Anuluj
        </Button>
        <Button variant={danger ? "danger" : "primary"} type={submitType} busy={busy} onClick={onSubmit}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}
