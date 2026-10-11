import { formatLongDate } from "../api/format";
import { type Training, useDeleteTraining } from "../api/trainings";
import { ConfirmDelete } from "./ConfirmDelete";
import { useToast } from "./Toast";

/** Asks before deleting a training together with its shooting entries. Open while `training` is set. */
export function DeleteTrainingDialog({ training, onClose }: { training: Training | null; onClose: () => void }) {
  const toast = useToast();
  const remove = useDeleteTraining();

  const close = () => {
    remove.reset();
    onClose();
  };

  const name = training ? `${formatLongDate(training.training_date)}${training.place ? ` (${training.place})` : ""}` : "";

  return (
    <ConfirmDelete
      open={training !== null}
      title={`Usunąć trening z ${name}?`}
      description="Razem z nim znikną wszystkie jego wpisy o strzelaniu. Tej operacji nie da się cofnąć."
      busy={remove.isPending}
      error={remove.error?.message}
      onCancel={close}
      onConfirm={() => {
        if (!training || remove.isPending) return;
        remove.mutate(training.id, {
          onSuccess: () => {
            close();
            toast("Usunięto");
          },
        });
      }}
    />
  );
}
