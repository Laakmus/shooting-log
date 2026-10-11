import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { todayIso } from "../api/format";
import { useSaveWeapon, type Weapon } from "../api/weapons";
import { Hint, INPUT, LABEL } from "./Field";
import { Modal, ModalActions, ModalBody } from "./Modal";
import { useToast } from "./Toast";

interface WeaponFormModalProps {
  open: boolean;
  /** The weapon being edited. Without it the window adds a new weapon. */
  weapon?: Weapon;
  onClose: () => void;
}

/** Window for adding a weapon or editing an existing one. */
export function WeaponFormModal({ open, weapon, onClose }: WeaponFormModalProps) {
  // Mounted only while open, so every opening starts from the clicked weapon's data.
  return open ? <WeaponForm weapon={weapon} onClose={onClose} /> : null;
}

function WeaponForm({ weapon, onClose }: { weapon?: Weapon; onClose: () => void }) {
  const editing = weapon !== undefined;
  const toast = useToast();
  const navigate = useNavigate();
  const save = useSaveWeapon(weapon?.id);

  const [owned, setOwned] = useState(weapon?.is_owned ?? true);
  const [name, setName] = useState(weapon?.name ?? "");
  const [capacity, setCapacity] = useState(String(weapon?.magazine_capacity ?? 15));
  const [purchaseDate, setPurchaseDate] = useState(weapon?.purchase_date ?? "");
  const [purchasePrice, setPurchasePrice] = useState(weapon?.purchase_price ?? "");
  const [note, setNote] = useState(weapon?.note ?? "");
  const [invalid, setInvalid] = useState<string | null>(null);

  const today = todayIso();

  /** Checks the rules the backend also enforces, so the message can be shown in Polish. */
  const validate = (): string | null => {
    if (!name.trim()) return "Podaj nazwę broni.";
    if (!/^\d+$/.test(capacity.trim()) || Number(capacity) < 1) {
      return "Pojemność magazynka musi być liczbą całkowitą większą od zera.";
    }
    if (owned && purchasePrice.trim() && !(Number(purchasePrice) >= 0)) return "Cena zakupu nie może być ujemna.";
    if (owned && purchaseDate > today) return "Data zakupu nie może być z przyszłości.";
    return null;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const problem = validate();
    setInvalid(problem);
    if (problem) {
      save.reset();
      return;
    }
    save.mutate(
      {
        name: name.trim(),
        magazine_capacity: Number(capacity),
        is_owned: owned,
        // A club weapon has no purchase: both fields are cleared explicitly.
        purchase_price: owned && purchasePrice.trim() ? purchasePrice.trim() : null,
        purchase_date: owned && purchaseDate ? purchaseDate : null,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          onClose();
          toast(editing ? "Zmiany zapisane" : "Broń dodana");
          if (!editing) navigate("/weapons");
        },
      },
    );
  };

  const typeButton = (isOwned: boolean, title: string, description: string) => (
    <button
      type="button"
      aria-pressed={owned === isOwned}
      onClick={() => setOwned(isOwned)}
      className={`cursor-pointer rounded-[9px] border px-[14px] py-3 text-left text-ink enabled:hover:border-accent enabled:hover:bg-accent-soft ${owned === isOwned ? "border-accent bg-accent-soft" : "border-line bg-page"}`}
    >
      <div className="mb-[2px] text-[13.5px] font-semibold">{title}</div>
      <div className="text-[11.5px] leading-[1.4] text-muted">{description}</div>
    </button>
  );

  return (
    <Modal
      open
      onClose={onClose}
      busy={save.isPending}
      narrow
      title={editing ? "Edytuj broń" : "Nowa broń"}
      subtitle={editing ? weapon.name : "Dodaj do ewidencji, żeby móc zapisywać z niej treningi"}
    >
      <ModalBody>
        <form onSubmit={submit} noValidate>
          <div className={LABEL} id="weapon-source-label">
            Skąd ta broń
          </div>
          <div role="group" aria-labelledby="weapon-source-label" className="mb-[18px] grid grid-cols-2 gap-[9px]">
            {typeButton(true, "Własna", "Kupiona, z ceną zakupu")}
            {typeButton(false, "Klubowa", "Broń strzelnicy, bez kosztu zakupu")}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL} htmlFor="weapon-name">
                Nazwa
              </label>
              <input
                id="weapon-name"
                type="text"
                placeholder="np. Glock 17"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="weapon-capacity">
                Magazynek<Hint>pocisków</Hint>
              </label>
              <input
                id="weapon-capacity"
                type="number"
                min={1}
                step={1}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                className={`${INPUT} num`}
              />
            </div>
          </div>

          {owned && (
            <div className="mt-1 mb-4 grid grid-cols-2 gap-3 border-t border-line pt-4 max-[400px]:grid-cols-1">
              <div className="min-w-0">
                <label className={LABEL} htmlFor="weapon-purchase-date">
                  Data zakupu<Hint>nieobowiązkowa</Hint>
                </label>
                <input
                  id="weapon-purchase-date"
                  type="date"
                  max={today}
                  value={purchaseDate}
                  onChange={(event) => setPurchaseDate(event.target.value)}
                  className={`${INPUT} num`}
                />
              </div>
              <div className="min-w-0">
                <label className={LABEL} htmlFor="weapon-purchase-price">
                  Cena zakupu<Hint>zł</Hint>
                </label>
                <input
                  id="weapon-purchase-price"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0.00"
                  value={purchasePrice}
                  onChange={(event) => setPurchasePrice(event.target.value)}
                  className={`${INPUT} num`}
                />
              </div>
            </div>
          )}

          <div>
            <label className={LABEL} htmlFor="weapon-note">
              Notatka<Hint>nieobowiązkowa</Hint>
            </label>
            <textarea
              id="weapon-note"
              placeholder="Uwagi, modyfikacje, historia serwisowa"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`${INPUT} min-h-[76px] resize-y leading-[1.5]`}
            />
          </div>

          {editing && (
            <p className="mt-3 mb-0 text-xs text-muted">Zmiana pojemności magazynka nie przelicza zapisanych treningów.</p>
          )}

          <ModalActions
            onCancel={onClose}
            submitLabel={editing ? "Zapisz zmiany" : "Dodaj broń"}
            submitType="submit"
            busy={save.isPending}
            error={invalid ?? save.error?.message}
          />
        </form>
      </ModalBody>
    </Modal>
  );
}
