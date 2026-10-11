import { Button } from "./Button";
import { FormError } from "./FormError";
import { Modal } from "./Modal";

interface ConfirmDeleteProps {
  open: boolean;
  /** Question naming the element, e.g. "Usunąć trening z 14 wrz?". */
  title: string;
  description: string;
  confirmLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation window shown before anything is deleted. */
export function ConfirmDelete({
  open,
  title,
  description,
  confirmLabel = "Usuń",
  busyLabel,
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDeleteProps) {
  return (
    <Modal open={open} onClose={onCancel} busy={busy} narrow hideClose>
      <div className="p-[22px]">
        <h3 className="m-0 mb-2 text-base font-[620]">{title}</h3>
        <p className="m-0 mb-5 text-[13.5px] leading-[1.55] text-muted">{description}</p>
        <FormError message={error} />
        <div className="flex justify-end gap-[9px]">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Anuluj
          </Button>
          <Button variant="danger" busy={busy} busyLabel={busyLabel} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
