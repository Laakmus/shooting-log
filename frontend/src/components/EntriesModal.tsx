import { useRef, useState } from "react";
import { centsToApi, type EntryMode, entryMode, entryPrice, isPrice, portionCents } from "../api/entries";
import { formatCount, plural } from "../api/format";
import { formatMoney } from "../api/money";
import { createEntry, deleteEntry, type Entry, type EntryUpdate, updateEntry, useRefreshAll } from "../api/trainings";
import type { WeaponDetail } from "../api/weapons";
import { Hint, INPUT, LABEL } from "./Field";
import { Modal, ModalActions, ModalBody } from "./Modal";
import { NumberStepper } from "./NumberStepper";
import { useToast } from "./Toast";

/** What the window edits: the entries one weapon already has in the training. */
export interface EntriesEdit {
  weaponId: number;
  weaponName: string;
  /** Unknown only if the weapon is missing from the weapons list. */
  weapon?: WeaponDetail;
  entries: Entry[];
}

interface EntriesModalProps {
  open: boolean;
  trainingId: number;
  /** Every weapon; the picker offers the active ones. */
  weapons: WeaponDetail[];
  /** Set to edit a weapon's entries; without it the window adds a weapon to the training. */
  edit?: EntriesEdit;
  onClose: () => void;
  /** Called after everything was saved, with the weapon the entries belong to. */
  onSaved: (weaponId: number) => void;
}

/** Window for adding shooting entries ("portions") of one weapon to a training, or editing them. */
export function EntriesModal({ open, ...rest }: EntriesModalProps) {
  // Mounted only while open, so every opening starts from the clicked weapon's data.
  return open ? <EntriesForm {...rest} /> : null;
}

const PORTIONS_ACCUSATIVE = ["porcję", "porcje", "porcji"] as const;
const PORTIONS = ["porcja", "porcje", "porcji"] as const;

const DEFAULT_CAPACITY = 15;
const MAX_MAGAZINES = 999;
const MAX_ROUNDS = 99_999;
// The cost column holds 8 digits before the separator.
const MAX_CENTS = 9_999_999_999;

/** Backend messages a user can run into here, in Polish. */
const REASONS: Record<string, string> = {
  "Weapon is not active": "Ta broń jest wycofana — nie można dodać z niej strzelania.",
  "Weapon not found": "Nie ma już takiej broni.",
  "Training not found": "Nie ma już tego treningu.",
  "Session not found": "Nie ma już tego wpisu.",
  "Count of magazines not equal number of rounds per magazine": "Liczba magazynków nie zgadza się z liczbą pocisków.",
  "Give a count of magazines and rounds fired": "Podaj liczbę magazynków albo pocisków.",
};

function reasonOf(error: unknown): string {
  const message = error instanceof Error ? error.message : "Nieznany błąd.";
  return REASONS[message] ?? message;
}

interface Portion {
  /** Stable React key; also tells portions apart while saving. */
  key: number;
  /** The saved entry behind the portion; absent for a portion not saved yet. */
  entry?: Entry;
  mode: EntryMode;
  magazines: number;
  perMagazine: number;
  /** False while "per magazine" still follows the capacity of the chosen weapon. */
  perMagazineTouched: boolean;
  rounds: number;
  /** Price of one round as typed; empty means "cost unknown". */
  price: string;
}

let nextKey = 1;

function newPortion(capacity: number): Portion {
  return { key: nextKey++, mode: "magazines", magazines: 1, perMagazine: capacity, perMagazineTouched: false, rounds: capacity, price: "" };
}

function portionOf(entry: Entry, capacity: number): Portion {
  const perMagazine = entry.rounds_per_magazine ?? capacity;
  return {
    key: nextKey++,
    entry,
    mode: entryMode(entry),
    magazines: entry.magazines_count ?? Math.max(1, Math.ceil(entry.rounds_fired / perMagazine)),
    perMagazine,
    perMagazineTouched: true,
    rounds: entry.rounds_fired,
    price: entryPrice(entry),
  };
}

const roundsOf = (portion: Portion) => (portion.mode === "magazines" ? portion.magazines * portion.perMagazine : portion.rounds);

/** Null when the portion has no price. */
const centsOf = (portion: Portion) => (isPrice(portion.price) ? portionCents(portion.price, roundsOf(portion)) : null);

/** "3 × 15 = 45 poc." or "37 poc." */
function describe(portion: Portion): string {
  const rounds = `${formatCount(roundsOf(portion))} poc.`;
  return portion.mode === "magazines" ? `${portion.magazines} × ${portion.perMagazine} = ${rounds}` : rounds;
}

function describeEntry(entry: Entry): string {
  return entryMode(entry) === "magazines"
    ? `${entry.magazines_count} × ${entry.rounds_per_magazine} = ${formatCount(entry.rounds_fired)} poc.`
    : `${formatCount(entry.rounds_fired)} poc.`;
}

/** The count fields to send: both magazine numbers, or the rounds alone (split by the weapon's capacity). */
function countsOf(portion: Portion, capacity: number): EntryUpdate {
  return portion.mode === "magazines"
    ? { magazines_count: portion.magazines, rounds_per_magazine: portion.perMagazine }
    : { rounds_fired: portion.rounds, rounds_per_magazine: capacity };
}

/** What changed in a saved portion, as a PATCH body; null when nothing did. */
function changesOf(portion: Portion, entry: Entry, capacity: number): EntryUpdate | null {
  const countsChanged =
    portion.mode !== entryMode(entry) ||
    (portion.mode === "magazines"
      ? portion.magazines !== entry.magazines_count || portion.perMagazine !== entry.rounds_per_magazine
      : portion.rounds !== entry.rounds_fired);
  const priceChanged = portion.price.trim() !== entryPrice(entry);
  if (!countsChanged && !priceChanged) return null;

  const cents = centsOf(portion);
  return {
    ...(countsChanged ? countsOf(portion, capacity) : {}),
    // The cost follows the rounds: it is price × rounds.
    ...(cents !== null ? { ammo_cost: centsToApi(cents) } : {}),
  };
}

const MODE_BUTTON = "cursor-pointer px-[11px] py-1 text-[11.5px] font-[560] not-first:border-l not-first:border-line focus-visible:-outline-offset-2";

interface PortionCardProps {
  portion: Portion;
  number: number;
  removable: boolean;
  onChange: (changes: Partial<Portion>) => void;
  onRemove: () => void;
}

function PortionCard({ portion, number, removable, onChange, onRemove }: PortionCardProps) {
  const rounds = roundsOf(portion);
  const cents = centsOf(portion);
  const priceId = `portion-price-${portion.key}`;
  const name = `Porcja ${number}`;

  const modeButton = (mode: EntryMode, label: string) => (
    <button
      type="button"
      aria-pressed={portion.mode === mode}
      onClick={() => {
        if (portion.mode === mode) return;
        // Switching to loose rounds starts from what the magazines added up to.
        onChange(mode === "rounds" ? { mode, rounds: Math.min(MAX_ROUNDS, rounds) } : { mode });
      }}
      className={`${MODE_BUTTON} ${portion.mode === mode ? "bg-accent text-on-accent" : "bg-card text-muted enabled:hover:text-accent"}`}
    >
      {label}
    </button>
  );

  return (
    <li className="mb-2 rounded-[9px] border border-line bg-page p-3">
      <div className="mb-[10px] flex items-center justify-between">
        <div role="group" aria-label={`${name}: sposób liczenia`} className="flex overflow-hidden rounded-[6px] border border-line">
          {modeButton("magazines", "Magazynki")}
          {modeButton("rounds", "Pociski")}
        </div>
        {removable && (
          <button
            type="button"
            aria-label={`Usuń porcję ${number}`}
            title={`Usuń porcję ${number}`}
            onClick={onRemove}
            className="h-6 w-6 cursor-pointer rounded-[6px] border border-line bg-card text-[11px] text-muted enabled:hover:border-danger enabled:hover:text-danger disabled:cursor-default disabled:opacity-55"
          >
            ✕
          </button>
        )}
      </div>

      {portion.mode === "magazines" ? (
        <div className="flex flex-wrap items-end gap-[10px]">
          <div>
            <div className={LABEL}>Ile</div>
            <NumberStepper
              label={`${name}: liczba magazynków`}
              value={portion.magazines}
              max={MAX_MAGAZINES}
              onChange={(magazines) => onChange({ magazines })}
            />
          </div>
          <span aria-hidden="true" className="pb-[9px] text-sm text-muted">
            ×
          </span>
          <div>
            <div className={LABEL}>Po ile</div>
            <NumberStepper
              label={`${name}: pocisków w magazynku`}
              value={portion.perMagazine}
              max={MAX_MAGAZINES}
              onChange={(perMagazine) => onChange({ perMagazine, perMagazineTouched: true })}
            />
          </div>
          <span aria-hidden="true" className="pb-[9px] text-sm text-muted">
            =
          </span>
          <span className="num min-w-[34px] pb-2 text-[19px] leading-none font-[640]" aria-label={`${rounds} pocisków`}>
            {formatCount(rounds)}
          </span>
        </div>
      ) : (
        <div>
          <div className={LABEL}>Ile pocisków</div>
          <NumberStepper label={`${name}: liczba pocisków`} value={portion.rounds} max={MAX_ROUNDS} onChange={(value) => onChange({ rounds: value })} />
        </div>
      )}

      <div className="mt-[11px] flex items-end gap-[10px] border-t border-dashed border-line pt-[11px]">
        <div className="w-[118px] flex-none">
          <label className={LABEL} htmlFor={priceId}>
            Cena za pocisk<Hint>zł</Hint>
          </label>
          <input
            id={priceId}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={portion.price}
            onChange={(event) => onChange({ price: event.target.value })}
            className={`${INPUT} num`}
          />
        </div>
        <span aria-hidden="true" className="pb-[9px] text-[13px] text-muted">
          →
        </span>
        <div className="min-w-0 pb-2">
          <span className="mb-[2px] block text-[11.5px] text-muted">Koszt porcji</span>
          <span className="num text-[17px] leading-none font-[640] text-accent">{formatMoney(cents === null ? null : cents / 100)}</span>
        </div>
      </div>
    </li>
  );
}

interface WeaponPickerProps {
  weapons: WeaponDetail[];
  selectedId: number | null;
  onSelect: (weapon: WeaponDetail) => void;
}

/** Alphabetical list of active weapons, narrowed by the search field. */
function WeaponPicker({ weapons, selectedId, onSelect }: WeaponPickerProps) {
  const [search, setSearch] = useState("");
  const active = weapons.filter((weapon) => weapon.is_active).sort((a, b) => a.name.localeCompare(b.name, "pl"));
  const phrase = search.trim().toLocaleLowerCase("pl");
  const shown = phrase ? active.filter((weapon) => weapon.name.toLocaleLowerCase("pl").includes(phrase)) : active;

  return (
    <div className="mb-4 border-b border-line pb-4">
      <label className={LABEL} htmlFor="entries-weapon-search">
        Broń
      </label>
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-[11px] -translate-y-1/2 text-[13px] text-muted">
          ⌕
        </span>
        <input
          id="entries-weapon-search"
          type="text"
          placeholder={`Szukaj wśród ${active.length} sztuk...`}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className={`${INPUT} pl-8`}
        />
      </div>
      {shown.length > 0 ? (
        <ul role="listbox" aria-label="Broń" className="m-0 mt-[6px] max-h-[126px] list-none overflow-y-auto rounded-lg border border-line bg-page p-0">
          {shown.map((weapon) => (
            <li key={weapon.id} role="presentation" className="border-b border-line last:border-b-0">
              <button
                type="button"
                role="option"
                aria-selected={weapon.id === selectedId}
                onClick={() => onSelect(weapon)}
                className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2 text-left text-[13.5px] text-ink focus-visible:-outline-offset-2 enabled:hover:bg-accent-soft ${weapon.id === selectedId ? "bg-accent-soft font-[560]" : ""}`}
              >
                <span className="min-w-0 [overflow-wrap:anywhere]">{weapon.name}</span>
                <span className="num flex-none text-[11.5px] font-medium text-muted">mag. {weapon.magazine_capacity}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 mt-[6px] rounded-lg border border-line bg-page px-3 py-2 text-[13px] text-muted">
          {active.length === 0 ? "Nie masz żadnej aktywnej broni. Dodaj ją w zakładce „Moja broń”." : "Brak broni o takiej nazwie."}
        </p>
      )}
    </div>
  );
}

function EntriesForm({ trainingId, weapons, edit, onClose, onSaved }: Omit<EntriesModalProps, "open">) {
  const editing = edit !== undefined;
  const toast = useToast();
  const refresh = useRefreshAll();

  const [picked, setPicked] = useState<WeaponDetail | null>(null);
  const weapon = editing ? edit.weapon : (picked ?? undefined);
  const capacity = weapon?.magazine_capacity ?? DEFAULT_CAPACITY;
  // A retired weapon accepts corrections of saved entries, but no new ones.
  const retired = editing && weapon?.is_active === false;

  const [portions, setPortions] = useState<Portion[]>(() =>
    editing && edit.entries.length > 0 ? edit.entries.map((entry) => portionOf(entry, capacity)) : [newPortion(capacity)],
  );
  /** Saved entries taken out of the window; deleted on save. */
  const [removed, setRemoved] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set at once, unlike state: a second click in the same moment must not start a second series of requests.
  const lock = useRef(false);

  const change = (key: number, changes: Partial<Portion>) =>
    setPortions((current) => current.map((portion) => (portion.key === key ? { ...portion, ...changes } : portion)));

  const remove = (portion: Portion) => {
    setPortions((current) => current.filter((item) => item.key !== portion.key));
    const { entry } = portion;
    if (entry) setRemoved((current) => [...current, entry]);
  };

  const pick = (next: WeaponDetail) => {
    setPicked(next);
    // Portions still on the default follow the capacity of the newly chosen weapon.
    setPortions((current) =>
      current.map((portion) =>
        portion.perMagazineTouched
          ? portion
          : { ...portion, perMagazine: next.magazine_capacity, rounds: portion.mode === "magazines" ? next.magazine_capacity : portion.rounds },
      ),
    );
  };

  const validate = (): string | null => {
    if (!editing && !picked) return "Wybierz broń z listy.";
    for (const [index, portion] of portions.entries()) {
      const name = portions.length > 1 ? `Porcja ${index + 1}: ` : "";
      const price = portion.price.trim();
      if (!price) {
        if (portion.entry?.ammo_cost != null) {
          return `${name}zapisanej ceny nie da się usunąć — wpisz cenę za pocisk (może być 0).`;
        }
        continue;
      }
      if (!isPrice(price)) return `${name}cena za pocisk musi być kwotą nie mniejszą niż 0, np. 2,40.`;
      if (portionCents(price, roundsOf(portion)) > MAX_CENTS) return `${name}koszt porcji jest za duży.`;
    }
    return null;
  };

  const save = async () => {
    if (lock.current) return;
    const problem = validate();
    setError(problem);
    if (problem) return;

    const weaponId = editing ? edit.weaponId : picked?.id;
    if (weaponId === undefined) return;

    // One request per portion that needs saving; `null` marks a saved portion left untouched.
    const steps = portions.map((portion) => {
      const { entry } = portion;
      if (!entry) {
        const cents = centsOf(portion);
        return () =>
          createEntry(trainingId, { weapon_id: weaponId, ...countsOf(portion, capacity), ammo_cost: cents === null ? null : centsToApi(cents) });
      }
      const changes = changesOf(portion, entry, capacity);
      return changes ? () => updateEntry(trainingId, entry.id, changes) : null;
    });
    const total = steps.filter(Boolean).length + removed.length;
    if (total === 0) {
      onClose();
      return;
    }

    lock.current = true;
    setSaving(true);
    let done = 0;
    let left = portions;
    let removedLeft = removed;
    let failure: string | null = null;

    for (const [index, portion] of portions.entries()) {
      const step = steps[index];
      if (!step) continue;
      try {
        const saved = await step();
        done += 1;
        // A saved portion leaves the adding window; while editing it stays as the weapon's entry.
        left = editing
          ? left.map((item) => (item.key === portion.key ? { ...portionOf(saved, capacity), key: portion.key } : item))
          : left.filter((item) => item.key !== portion.key);
      } catch (cause) {
        failure = `Nie udało się zapisać porcji nr ${index + 1} (${describe(portion)}): ${reasonOf(cause)}`;
        break;
      }
    }
    if (failure === null) {
      for (const entry of removed) {
        try {
          await deleteEntry(trainingId, entry.id);
          done += 1;
          removedLeft = removedLeft.filter((item) => item.id !== entry.id);
        } catch (cause) {
          failure = `Nie udało się usunąć porcji (${describeEntry(entry)}): ${reasonOf(cause)}`;
          break;
        }
      }
    }

    // Whatever was saved changes the training, the weapons and the statistics.
    if (done > 0) await refresh();
    lock.current = false;
    setSaving(false);

    if (failure === null) {
      onClose();
      toast(editing ? "Zmiany zapisane" : `Dodano ${done} ${plural(done, PORTIONS_ACCUSATIVE)}`);
      onSaved(weaponId);
      return;
    }

    setPortions(left);
    setRemoved(removedLeft);
    if (total === 1) setError(failure);
    else if (editing) setError(`Zapisano ${done} z ${total} zmian. ${failure} Niezapisane zmiany zostały w oknie.`);
    else {
      const progress = done === 0 ? "Nie zapisano żadnej porcji." : `Zapisano ${done} z ${total} porcji.`;
      setError(`${progress} ${failure} Niezapisane porcje zostały w oknie.`);
    }
  };

  const rounds = portions.reduce((sum, portion) => sum + roundsOf(portion), 0);
  const priced = portions.map(centsOf).filter((cents) => cents !== null);
  const cost = priced.length > 0 ? priced.reduce((sum, cents) => sum + cents, 0) / 100 : null;

  return (
    <Modal
      open
      onClose={onClose}
      busy={saving}
      title={editing ? "Edytuj strzelanie" : "Dodaj broń do treningu"}
      subtitle={editing ? edit.weaponName : undefined}
    >
      <ModalBody>
        {!editing && <WeaponPicker weapons={weapons} selectedId={picked?.id ?? null} onSelect={pick} />}

        <div className="mb-[10px] flex items-baseline justify-between">
          <span className="text-[12.5px] font-semibold">Porcje strzelania</span>
          <span className="text-[11.5px] text-muted">
            {portions.length} {plural(portions.length, PORTIONS)}
          </span>
        </div>
        <ul className="m-0 list-none p-0">
          {portions.map((portion, index) => (
            <PortionCard
              key={portion.key}
              portion={portion}
              number={index + 1}
              removable={portions.length > 1}
              onChange={(changes) => change(portion.key, changes)}
              onRemove={() => remove(portion)}
            />
          ))}
        </ul>
        {retired ? (
          <p className="m-0 text-xs text-muted">Broń jest wycofana: zapisane porcje można poprawiać, ale nie da się dodać nowych.</p>
        ) : (
          <button
            type="button"
            onClick={() => setPortions((current) => [...current, newPortion(capacity)])}
            className="w-full cursor-pointer rounded-[9px] border border-dashed border-line p-[10px] text-[13px] text-muted enabled:hover:border-accent enabled:hover:text-accent disabled:cursor-default disabled:opacity-55"
          >
            + Dodaj kolejną porcję
          </button>
        )}

        <div className="mt-[14px] flex items-baseline justify-between gap-3 border-t border-line pt-[14px]">
          <span className="text-[12.5px] text-muted">Razem z tej broni</span>
          <span className="num text-right text-[25px] leading-none font-[640]">
            {formatCount(rounds)}
            <span className="ml-1 text-[11px] font-medium text-muted">poc.</span>
            <span className="ml-3 text-base text-accent">{formatMoney(cost)}</span>
          </span>
        </div>

        <ModalActions
          onCancel={onClose}
          onSubmit={() => void save()}
          submitLabel={editing ? "Zapisz zmiany" : `Zapisz ${portions.length} ${plural(portions.length, PORTIONS_ACCUSATIVE)}`}
          busy={saving}
          error={error}
        />
      </ModalBody>
    </Modal>
  );
}
