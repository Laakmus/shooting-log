import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { magazineLoads } from "../api/entries";
import { formatCount, formatLongDate, formatWeekday, plural } from "../api/format";
import { formatAmount, formatMoney, toNumber } from "../api/money";
import { type Entry, useTraining, useTrainingEntries } from "../api/trainings";
import { useWeapons, type WeaponDetail } from "../api/weapons";
import { Button } from "../components/Button";
import { DeleteEntriesDialog } from "../components/DeleteEntriesDialog";
import { DeleteTrainingDialog } from "../components/DeleteTrainingDialog";
import { type EntriesEdit, EntriesModal } from "../components/EntriesModal";
import { IconButton } from "../components/IconButton";
import { LoadError } from "../components/LoadError";
import { Page } from "../components/Page";
import { Tag } from "../components/Tag";
import { TrainingFormModal } from "../components/TrainingFormModal";

const ROUNDS = ["pocisk", "pociski", "pocisków"] as const;
const WEAPONS = ["broń", "bronie", "broni"] as const;
const SESSIONS = ["trening", "treningi", "treningów"] as const;

/** How long a freshly added weapon's tile stays highlighted. */
const HIGHLIGHT_MS = 1800;

/** Entries of one weapon in this training, shown as a single tile. */
interface WeaponGroup {
  weaponId: number;
  name: string;
  /** Missing only when the weapons list does not know the weapon. */
  weapon?: WeaponDetail;
  entries: Entry[];
  rounds: number;
  /** Sum of the known entry costs; null when no entry has a cost. */
  cost: number | null;
  /** Rounds of the entries that have a cost: the base of the price per shot. */
  pricedRounds: number;
}

function groupByWeapon(entries: Entry[], weapons: WeaponDetail[], names: Map<number, string>): WeaponGroup[] {
  const groups = new Map<number, WeaponGroup>();
  // Oldest entry first, so tiles keep the order in which weapons were added.
  for (const entry of [...entries].sort((a, b) => a.id - b.id)) {
    let group = groups.get(entry.weapon_id);
    if (!group) {
      const weapon = weapons.find((item) => item.id === entry.weapon_id);
      group = {
        weaponId: entry.weapon_id,
        name: weapon?.name ?? names.get(entry.weapon_id) ?? `Broń nr ${entry.weapon_id}`,
        weapon,
        entries: [],
        rounds: 0,
        cost: null,
        pricedRounds: 0,
      };
      groups.set(entry.weapon_id, group);
    }
    group.entries.push(entry);
    group.rounds += entry.rounds_fired;
    const cost = toNumber(entry.ammo_cost);
    if (cost !== null) {
      group.cost = (group.cost ?? 0) + cost;
      group.pricedRounds += entry.rounds_fired;
    }
  }
  return [...groups.values()];
}

/** Magazines as upright bars with the round count above; a partly loaded one is filled in proportion. */
function Magazines({ entries, capacity }: { entries: Entry[]; capacity: number }) {
  const loads = entries.flatMap((entry) => magazineLoads(entry, capacity));
  return (
    <div role="img" aria-label={`magazynki: ${loads.join(", ")}`} className="mt-[13px] flex flex-wrap items-end gap-x-[5px] gap-y-2">
      {loads.map((rounds, index) => {
        const partial = rounds < capacity;
        return (
          <div key={index} className="flex flex-col items-center gap-1">
            <span className={`num text-[10px] leading-none ${partial ? "font-[640] text-accent" : "font-medium text-muted"}`}>{rounds}</span>
            <span
              data-magazine={partial ? "partial" : "full"}
              className="relative block h-[26px] w-[11px] overflow-hidden rounded-t-[2px] rounded-b-[3px] border-[1.5px] border-accent opacity-75"
            >
              <span className="absolute inset-x-0 bottom-0 bg-accent" style={{ height: `${Math.min(100, (rounds / capacity) * 100)}%` }} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface WeaponTileProps {
  group: WeaponGroup;
  highlighted: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function WeaponTile({ group, highlighted, onEdit, onDelete }: WeaponTileProps) {
  const { weapon, name } = group;
  // Without the weapon the best guess for a full magazine is the largest load recorded in the entries.
  const capacity = weapon?.magazine_capacity ?? Math.max(1, ...group.entries.map((entry) => entry.rounds_per_magazine ?? 1));
  const perRound = group.cost !== null && group.pricedRounds > 0 ? group.cost / group.pricedRounds : null;

  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlighted]);

  return (
    <li
      ref={ref}
      data-highlighted={highlighted || undefined}
      className={`group relative flex min-w-0 flex-col rounded-[10px] border px-[18px] py-4 shadow-card transition-[border-color,background-color,box-shadow] duration-300 hover:border-accent hover:bg-accent-soft ${
        highlighted ? "border-accent bg-accent-soft ring-2 ring-accent" : "border-line bg-card"
      }`}
    >
      {/* Hidden until the tile is hovered or focused; always visible on touch screens. */}
      <div className="absolute top-[13px] right-[14px] flex gap-[5px] opacity-0 transition-opacity duration-[160ms] group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <IconButton label={`Edytuj strzelanie z ${name}`} onClick={onEdit}>
          ✎
        </IconButton>
        <IconButton label={`Usuń strzelanie z ${name}`} onClick={onDelete}>
          ✕
        </IconButton>
      </div>

      <div className="mb-[2px] flex flex-wrap items-center gap-x-2 gap-y-1 pr-[66px]">
        <span className="text-base font-[620] tracking-[-0.01em] [overflow-wrap:anywhere]">{name}</span>
        {weapon && !weapon.is_owned && <Tag>klubowa</Tag>}
        {weapon && !weapon.is_active && <Tag muted>wycofana</Tag>}
      </div>
      <div className="mb-[13px] text-xs text-muted">{weapon ? `magazynek na ${weapon.magazine_capacity}` : "—"}</div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="num text-[28px] leading-none font-[640] tracking-[-0.03em]">
          {formatCount(group.rounds)}
          <span className="ml-1 text-[11px] font-medium tracking-normal text-muted">poc.</span>
        </span>
        <span className="num text-lg leading-none font-semibold text-accent">{formatMoney(group.cost)}</span>
      </div>
      <div className="num mt-[10px] flex items-baseline gap-[5px] text-[12.5px] leading-none font-medium">
        <span className="font-sans text-[11.5px] font-normal text-muted">za strzał</span> {formatMoney(perRound)}
      </div>

      <Magazines entries={group.entries} capacity={capacity} />

      {/* Pushed to the bottom, so footers line up across tiles of different height. */}
      <div className="mt-auto pt-[13px]">
        <div className="flex flex-wrap justify-between gap-x-2 gap-y-[2px] border-t border-line pt-[10px] text-[11.5px] text-muted tabular-nums">
          <span>Łącznie z tej broni</span>
          {weapon ? (
            <span>
              <b className="font-semibold text-ink">{formatCount(weapon.total_rounds)}</b> poc. ·{" "}
              <b className="font-semibold text-ink">{formatCount(weapon.sessions_count)}</b> {plural(weapon.sessions_count, SESSIONS)}
            </span>
          ) : (
            <span>—</span>
          )}
        </div>
      </div>
    </li>
  );
}

export function TrainingDetails() {
  const { id } = useParams();
  const trainingId = /^\d+$/.test(id ?? "") ? Number(id) : Number.NaN;
  const navigate = useNavigate();
  const location = useLocation();

  // The list hands over its filter, sorting and page, so going back restores them.
  const search = (location.state as { trainingsSearch?: string } | null)?.trainingsSearch;
  const backTo = search ? `/trainings?${search}` : "/trainings";
  const backLink = (
    <Link to={backTo} className="mb-[14px] inline-flex items-center gap-[6px] text-sm text-muted no-underline hover:text-accent">
      ← Treningi
    </Link>
  );

  const training = useTraining(trainingId);
  const entries = useTrainingEntries(trainingId);
  const weapons = useWeapons();

  const [editingTraining, setEditingTraining] = useState(false);
  const [deletingTraining, setDeletingTraining] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingEntries, setEditingEntries] = useState<EntriesEdit | null>(null);
  const [deletingWeaponId, setDeletingWeaponId] = useState<number | null>(null);
  const [highlightedId, setHighlightedId] = useState<number | null>(null);
  /** Set once the training was deleted here, until the list replaces this view. */
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    if (highlightedId === null) return;
    const timer = window.setTimeout(() => setHighlightedId(null), HIGHLIGHT_MS);
    return () => window.clearTimeout(timer);
  }, [highlightedId]);

  // While the training is being deleted its reload already answers 404; the view stays until the list takes over.
  const leaving = deletingTraining || deleted;
  const notFound = Number.isNaN(trainingId) || (training.error instanceof ApiError && training.error.status === 404 && !leaving);
  if (notFound) {
    return (
      <Page>
        {backLink}
        <h1 className="m-0 mb-[6px] text-2xl font-[640] tracking-[-0.02em]">Nie ma takiego treningu</h1>
        <p className="m-0 text-sm text-muted">Trening o tym numerze nie istnieje. Wróć do listy i wybierz inny.</p>
      </Page>
    );
  }
  const data = training.data;
  if (!data) {
    return (
      <Page>
        {backLink}
        {training.error ? (
          <LoadError message={training.error.message} onRetry={() => void training.refetch()} />
        ) : (
          <p className="m-0 text-sm text-muted">Wczytywanie…</p>
        )}
      </Page>
    );
  }

  const names = new Map(data.weapons.map((weapon) => [weapon.id, weapon.name]));
  const groups = entries.data && weapons.data ? groupByWeapon(entries.data, weapons.data, names) : undefined;
  const deletingGroup = groups?.find((group) => group.weaponId === deletingWeaponId);
  const rounds = groups?.reduce((sum, group) => sum + group.rounds, 0) ?? 0;
  const partsError = entries.error ?? weapons.error;

  const openAdding = () => setAdding(true);

  let content: ReactNode;
  if (!groups) {
    content = partsError ? (
      <div className="mt-6">
        <LoadError
          message={partsError.message}
          onRetry={() => {
            void entries.refetch();
            void weapons.refetch();
          }}
        />
      </div>
    ) : (
      <p className="mt-6 mb-0 text-sm text-muted">Wczytywanie…</p>
    );
  } else if (groups.length === 0) {
    // A training without any weapon: only the way to add one.
    content = (
      <button
        type="button"
        onClick={openAdding}
        className="mt-6 flex w-full cursor-pointer flex-col items-center justify-center gap-[6px] rounded-[11px] border-[1.5px] border-dashed border-line px-5 py-[34px] text-sm leading-none font-[560] text-muted hover:border-accent hover:text-accent"
      >
        <span aria-hidden="true" className="text-[26px] leading-none font-light">
          +
        </span>
        <span>Dodaj broń</span>
      </button>
    );
  } else {
    content = (
      <>
        {data.note && (
          <p className="mt-4 mb-0 rounded-r-lg border-l-[3px] border-accent bg-accent-soft px-4 py-[11px] text-sm leading-[1.55] whitespace-pre-line [overflow-wrap:anywhere]">
            {data.note}
          </p>
        )}

        <div className="mt-6 mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
          <h2 className="m-0 text-[13px] font-semibold">Oddane strzały</h2>
          <span className="text-[11.5px] text-muted tabular-nums">
            {groups.length} {plural(groups.length, WEAPONS)} · {formatCount(rounds)} {plural(rounds, ROUNDS)}
          </span>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[10px] p-0">
          {groups.map((group) => (
            <WeaponTile
              key={group.weaponId}
              group={group}
              highlighted={group.weaponId === highlightedId}
              onEdit={() =>
                setEditingEntries({ weaponId: group.weaponId, weaponName: group.name, weapon: group.weapon, entries: group.entries })
              }
              onDelete={() => setDeletingWeaponId(group.weaponId)}
            />
          ))}
        </ul>
        <button
          type="button"
          onClick={openAdding}
          className="mt-[9px] w-full cursor-pointer rounded-[10px] border border-dashed border-line p-[13px] text-[13px] text-muted hover:border-accent hover:bg-accent-soft hover:text-accent"
        >
          + Dodaj kolejną broń do tego treningu
        </button>

        <div className="mt-[22px] flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line pt-[15px]">
          <span className="text-[12.5px] text-muted">Razem w tym treningu</span>
          <span className="text-base font-[620] tabular-nums">
            {groups.length} {plural(groups.length, WEAPONS)} · {formatCount(data.total_rounds)} {plural(data.total_rounds, ROUNDS)} ·{" "}
            {formatMoney(data.total_cost)}
          </span>
        </div>
        <p className="mt-1 mb-0 text-right text-xs text-muted tabular-nums">
          amunicja {formatMoney(data.ammo_cost)} + wejście {formatMoney(data.cost)}
        </p>
      </>
    );
  }

  const title = formatLongDate(data.training_date);
  return (
    <Page>
      {backLink}
      <div className="mb-[6px] flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
        <h1 className="m-0 text-2xl font-[640] tracking-[-0.02em]">{title}</h1>
        <div className="flex items-center gap-[7px]">
          <IconButton large label={`Edytuj trening z ${title}`} onClick={() => setEditingTraining(true)}>
            ✎
          </IconButton>
          <IconButton large label={`Usuń trening z ${title}`} onClick={() => setDeletingTraining(true)}>
            ✕
          </IconButton>
          <Button onClick={openAdding} disabled={!weapons.data}>
            Dodaj broń
          </Button>
        </div>
      </div>
      <div className="mb-1 flex flex-wrap gap-x-[18px] gap-y-[6px] text-sm text-muted">
        {data.place && <span className="[overflow-wrap:anywhere]">{data.place}</span>}
        <span>
          Wejście <b className="font-[560] text-ink tabular-nums">{formatAmount(data.cost)} zł</b>
        </span>
        <span>{formatWeekday(data.training_date)}</span>
      </div>

      {content}

      <TrainingFormModal open={editingTraining} training={data} onClose={() => setEditingTraining(false)} />
      <DeleteTrainingDialog
        training={deletingTraining ? data : null}
        onClose={() => setDeletingTraining(false)}
        onDeleted={() => {
          setDeleted(true);
          navigate(backTo, { replace: true });
        }}
      />
      <EntriesModal
        open={adding}
        trainingId={trainingId}
        weapons={weapons.data ?? []}
        onClose={() => setAdding(false)}
        onSaved={setHighlightedId}
      />
      <EntriesModal
        open={editingEntries !== null}
        trainingId={trainingId}
        weapons={weapons.data ?? []}
        edit={editingEntries ?? undefined}
        onClose={() => setEditingEntries(null)}
        onSaved={() => {}}
      />
      <DeleteEntriesDialog
        trainingId={trainingId}
        target={deletingGroup ? { weaponName: deletingGroup.name, entries: deletingGroup.entries } : null}
        onClose={() => setDeletingWeaponId(null)}
      />
    </Page>
  );
}
