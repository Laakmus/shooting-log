import { useRef, useState } from "react";
import { plural } from "../api/format";
import { deleteEntry, type Entry, useRefreshAll } from "../api/trainings";
import { ConfirmDelete } from "./ConfirmDelete";
import { useToast } from "./Toast";

interface DeleteEntriesDialogProps {
  trainingId: number;
  /** The weapon whose shooting is removed from the training; the window is open while it is set. */
  target: { weaponName: string; entries: Entry[] } | null;
  onClose: () => void;
}

const ENTRIES = ["wpis", "wpisy", "wpisów"] as const;

/** Asks before removing a weapon from a training: every entry of that weapon is deleted. */
export function DeleteEntriesDialog({ trainingId, target, onClose }: DeleteEntriesDialogProps) {
  const toast = useToast();
  const refresh = useRefreshAll();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);

  const close = () => {
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!target || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    let done = 0;
    let failure: string | null = null;
    for (const entry of target.entries) {
      try {
        await deleteEntry(trainingId, entry.id);
        done += 1;
      } catch (cause) {
        failure = cause instanceof Error ? cause.message : "Nieznany błąd.";
        break;
      }
    }
    // The view then shows only the entries that are still there, so a retry deletes just those.
    if (done > 0) await refresh();
    lock.current = false;
    setBusy(false);
    if (failure === null) {
      close();
      toast("Usunięto");
    } else {
      setError(target.entries.length > 1 ? `Usunięto ${done} z ${target.entries.length} wpisów. ${failure}` : failure);
    }
  };

  const count = target?.entries.length ?? 0;
  return (
    <ConfirmDelete
      open={target !== null}
      title={`Usunąć strzelanie z ${target?.weaponName ?? ""}?`}
      description={
        count > 1
          ? `Z tego treningu znikną wszystkie ${count} ${plural(count, ENTRIES)} tej broni. Sama broń zostaje w ewidencji.`
          : "Wpis zniknie z tego treningu. Sama broń zostaje w ewidencji."
      }
      busy={busy}
      error={error}
      onCancel={close}
      onConfirm={() => void confirm()}
    />
  );
}
