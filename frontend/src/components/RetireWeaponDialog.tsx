import { useRetireWeapon, type Weapon } from "../api/weapons";
import { ConfirmDelete } from "./ConfirmDelete";
import { useToast } from "./Toast";

/** Asks before retiring a weapon (soft delete). Open while `weapon` is set. */
export function RetireWeaponDialog({ weapon, onClose }: { weapon: Weapon | null; onClose: () => void }) {
  const toast = useToast();
  const retire = useRetireWeapon();

  const close = () => {
    retire.reset();
    onClose();
  };

  return (
    <ConfirmDelete
      open={weapon !== null}
      title={`Wycofać ${weapon?.name ?? ""}?`}
      description="Broń zniknie z listy wyboru, ale jej historia strzelania zostanie zachowana."
      busy={retire.isPending}
      error={retire.error?.message}
      onCancel={close}
      onConfirm={() => {
        if (!weapon) return;
        retire.mutate(weapon.id, {
          onSuccess: () => {
            close();
            toast("Broń wycofana");
          },
        });
      }}
    />
  );
}
