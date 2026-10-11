import { type ReactNode, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { formatCount, formatMonthName, formatMonthTitle, formatShortMonth, plural, todayIso } from "../api/format";
import { formatAmount, formatMoney, toNumber } from "../api/money";
import { totalRounds, useStats } from "../api/stats";
import {
  PAGE_SIZE,
  TRAINING_SORTS,
  type Training,
  type TrainingSort,
  useTrainingsOverview,
  useTrainingsPage,
} from "../api/trainings";
import { useWeapons } from "../api/weapons";
import { Button } from "../components/Button";
import { DeleteTrainingDialog } from "../components/DeleteTrainingDialog";
import { EmptyState } from "../components/EmptyState";
import { IconButton } from "../components/IconButton";
import { LoadError } from "../components/LoadError";
import { MissingEndpoint } from "../components/MissingEndpoint";
import { Page } from "../components/Page";
import { SummaryTile, SummaryTiles } from "../components/SummaryTile";
import { Tag } from "../components/Tag";
import { TrainingCalendar } from "../components/TrainingCalendar";
import { TrainingFormModal } from "../components/TrainingFormModal";
import { WeaponFormModal } from "../components/WeaponFormModal";

const ROUNDS = ["pocisk", "pociski", "pocisków"] as const;
const VISITS = ["wyjście", "wyjścia", "wyjść"] as const;

const SORT_LABELS: Record<TrainingSort, string> = {
  date_desc: "Od najnowszych",
  date_asc: "Od najstarszych",
  cost_desc: "Od najdroższych",
  cost_asc: "Od najtańszych",
};

const SELECT =
  "max-w-full cursor-pointer rounded-[7px] border border-line bg-page px-[11px] py-[7px] text-[13px] text-ink focus:border-accent disabled:cursor-default disabled:opacity-55";

/**
 * Filter, sorting, page and view live in the address (/#/trainings?weapon=3&sort=cost_desc&page=2),
 * so they are still set after coming back from a training's details.
 */
function useListState() {
  const [params, setParams] = useSearchParams();

  const weapon = params.get("weapon") ?? "";
  const sortParam = params.get("sort") as TrainingSort;
  const pageParam = params.get("page") ?? "";
  const monthParam = params.get("month") ?? "";

  const update = (changes: Record<string, string | null>) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(changes)) {
          if (value === null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );

  return {
    weaponId: /^\d+$/.test(weapon) ? Number(weapon) : undefined,
    sort: TRAINING_SORTS.includes(sortParam) ? sortParam : "date_desc",
    page: /^[1-9]\d*$/.test(pageParam) ? Number(pageParam) : 1,
    calendar: params.get("view") === "calendar",
    month: /^\d{4}-(0[1-9]|1[0-2])$/.test(monthParam) ? monthParam : todayIso().slice(0, 7),
    search: params.toString(),
    // A new filter or sorting starts again from the first page.
    setWeapon: (id: string) => update({ weapon: id || null, page: null }),
    setSort: (sort: TrainingSort) => update({ sort: sort === "date_desc" ? null : sort, page: null }),
    setPage: (page: number) => update({ page: page > 1 ? String(page) : null }),
    setCalendar: (calendar: boolean) => update({ view: calendar ? "calendar" : null }),
    setMonth: (month: string) => update({ month }),
  };
}

interface TrainingRowProps {
  training: Training;
  /** Shown when no month heading above the row tells the year. */
  showYear: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function TrainingRow({ training, showYear, onOpen, onEdit, onDelete }: TrainingRowProps) {
  const [year = "", , day = ""] = training.training_date.split("-");
  const name = `trening z ${day}.${training.training_date.slice(5, 7)}.${year}`;
  const hasWeapons = training.weapons.length > 0;
  return (
    <li>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen();
          }
        }}
        className="group grid cursor-pointer grid-cols-[54px_minmax(0,1fr)_auto_auto] items-center gap-4 rounded-[10px] border border-line bg-card px-4 py-[13px] shadow-card transition-[border-color,background-color] duration-[160ms] hover:border-accent hover:bg-accent-soft max-[620px]:grid-cols-[44px_minmax(0,1fr)_auto] max-[620px]:gap-x-[10px] max-[620px]:gap-y-[6px] max-[620px]:px-3"
      >
        <div className="border-r border-line pr-3 text-center max-[620px]:row-span-2 max-[620px]:pr-2">
          <div className="text-[19px] leading-[1.1] font-[640] tabular-nums">{day}</div>
          <div className="text-[10.5px] tracking-[0.05em] text-muted uppercase">{formatShortMonth(training.training_date)}</div>
          {showYear && <div className="text-[10.5px] text-muted tabular-nums">{year}</div>}
        </div>

        <div className="min-w-0 max-[620px]:row-span-2">
          <div className="mb-1 text-sm font-[560] [overflow-wrap:anywhere]">
            {training.place ?? <span className="font-normal text-muted">—</span>}
          </div>
          <div className="flex flex-wrap gap-[5px]">
            {hasWeapons ? (
              training.weapons.map((weapon) => (
                <Tag key={weapon.id} className="font-normal whitespace-normal group-hover:bg-card">
                  {weapon.name}
                </Tag>
              ))
            ) : (
              <span className="text-[11.5px] text-muted italic">jeszcze bez broni</span>
            )}
          </div>
        </div>

        <div className="text-right whitespace-nowrap">
          <div className="num text-xl leading-none font-[640]">
            {hasWeapons ? (
              <>
                {formatCount(training.total_rounds)}
                <span className="ml-[3px] text-[10px] font-medium text-muted">poc.</span>
              </>
            ) : (
              "—"
            )}
          </div>
          <div className="mt-1 text-[11.5px] text-muted tabular-nums">{formatMoney(training.total_cost)}</div>
        </div>

        {/* Hidden until the row is hovered or focused; always visible on touch screens. */}
        <div className="flex justify-end gap-[5px] opacity-0 transition-opacity duration-[160ms] group-focus-within:opacity-100 group-hover:opacity-100 max-[620px]:col-start-3 [@media(hover:none)]:opacity-100">
          <IconButton label={`Edytuj ${name}`} onClick={onEdit}>
            ✎
          </IconButton>
          <IconButton label={`Usuń ${name}`} onClick={onDelete}>
            ✕
          </IconButton>
        </div>
      </div>
    </li>
  );
}

/** Rows split into months, in the order they arrived. Used only when the list is sorted by date. */
function groupByMonth(trainings: Training[]): { month: string; rows: Training[] }[] {
  const groups: { month: string; rows: Training[] }[] = [];
  for (const training of trainings) {
    const month = training.training_date.slice(0, 7);
    const last = groups.at(-1);
    if (last?.month === month) last.rows.push(training);
    else groups.push({ month, rows: [training] });
  }
  return groups;
}

/** Page numbers to show: all of them when few, otherwise the ends and the neighbours of the current page. */
function pageNumbers(current: number, count: number): (number | "gap")[] {
  if (count <= 7) return Array.from({ length: count }, (_unused, index) => index + 1);
  const shown = [...new Set([1, current - 1, current, current + 1, count])].filter((page) => page >= 1 && page <= count);
  return shown.flatMap((page, index) => (index > 0 && page - (shown[index - 1] ?? 0) > 1 ? (["gap", page] as const) : [page]));
}

function Pagination({ page, count, onChange }: { page: number; count: number; onChange: (page: number) => void }) {
  if (count <= 1) return null;
  const base =
    "num h-8 min-w-8 rounded-[7px] border px-1 text-[13px] font-medium enabled:cursor-pointer disabled:opacity-40";
  const idle = "border-line bg-card text-muted enabled:hover:border-accent enabled:hover:text-accent";
  return (
    <nav aria-label="Strony listy treningów" className="mt-[22px] flex flex-wrap justify-center gap-[5px]">
      <button type="button" aria-label="Poprzednia strona" disabled={page <= 1} onClick={() => onChange(page - 1)} className={`${base} ${idle}`}>
        ‹
      </button>
      {pageNumbers(page, count).map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} aria-hidden="true" className="grid h-8 min-w-5 place-items-center text-muted">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            aria-label={`Strona ${item}`}
            aria-current={item === page ? "page" : undefined}
            onClick={() => onChange(item)}
            className={`${base} ${item === page ? "border-accent bg-accent text-on-accent" : idle}`}
          >
            {item}
          </button>
        ),
      )}
      <button type="button" aria-label="Następna strona" disabled={page >= count} onClick={() => onChange(page + 1)} className={`${base} ${idle}`}>
        ›
      </button>
    </nav>
  );
}

function ViewSwitch({ calendar, onChange }: { calendar: boolean; onChange: (calendar: boolean) => void }) {
  const button = (label: string, value: boolean) => (
    <button
      type="button"
      aria-pressed={calendar === value}
      onClick={() => onChange(value)}
      className={`cursor-pointer px-[13px] py-[6px] text-[12.5px] font-[560] not-first:border-l not-first:border-line focus-visible:-outline-offset-2 ${calendar === value ? "bg-accent text-on-accent" : "bg-page text-muted hover:text-accent"}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="Sposób wyświetlania" className="ml-auto flex overflow-hidden rounded-[7px] border border-line">
      {button("Lista", false)}
      {button("Kalendarz", true)}
    </div>
  );
}

export function Trainings() {
  const navigate = useNavigate();
  const state = useListState();
  const overview = useTrainingsOverview();
  const weapons = useWeapons();
  const stats = useStats();
  const list = useTrainingsPage({ weaponId: state.weaponId, sort: state.sort, page: state.page, enabled: !state.calendar });

  const [adding, setAdding] = useState(false);
  const [addingWeapon, setAddingWeapon] = useState(false);
  const [editing, setEditing] = useState<Training | null>(null);
  const [deleting, setDeleting] = useState<Training | null>(null);

  const pageCount = list.data ? Math.ceil(list.data.total / PAGE_SIZE) : 0;
  const { page, setPage } = state;
  // After a deletion (or with a stale address) the page may no longer exist: fall back to the last one.
  useEffect(() => {
    if (list.data && !list.isPlaceholderData && pageCount > 0 && page > pageCount) setPage(pageCount);
  });

  const windows = (
    <>
      <TrainingFormModal open={adding} onClose={() => setAdding(false)} />
      <TrainingFormModal open={editing !== null} training={editing ?? undefined} onClose={() => setEditing(null)} />
      <DeleteTrainingDialog training={deleting} onClose={() => setDeleting(null)} />
      <WeaponFormModal open={addingWeapon} onClose={() => setAddingWeapon(false)} />
    </>
  );

  if (overview.error) {
    return (
      <Page title="Treningi" subtitle="Lista treningów jest chwilowo niedostępna.">
        <LoadError message={overview.error.message} onRetry={() => void overview.refetch()} />
      </Page>
    );
  }
  if (overview.isPending) return <Page title="Treningi" subtitle="Wczytywanie…" />;

  if (overview.data.count === 0) {
    // Without any weapon a training could not be filled in, so the weapon comes first.
    const noWeapons = weapons.data?.length === 0;
    return (
      <Page>
        {noWeapons ? (
          <EmptyState
            text="Nie masz jeszcze żadnej broni. Dodaj pierwszą, a potem zapisz trening — reszta policzy się sama."
            actionLabel="Dodaj pierwszą broń"
            onAction={() => setAddingWeapon(true)}
          />
        ) : (
          <EmptyState
            text="Nie masz jeszcze żadnego treningu. Zapisz pierwsze wyjście na strzelnicę — datę, miejsce i koszt wejścia."
            actionLabel="Dodaj pierwszy trening"
            onAction={() => setAdding(true)}
          />
        )}
        {windows}
      </Page>
    );
  }

  const { count, firstDate } = overview.data;
  const rounds = stats.data ? totalRounds(stats.data) : undefined;
  const ammo = toNumber(stats.data?.total.ammo_cost);
  const fees = toNumber(stats.data?.total.training_sessions_cost);

  // Values that depend on /stats/: "…" while loading, "—" after a failed load.
  const fromStats = (value: ReactNode): ReactNode => (stats.isPending ? "…" : stats.error ? "—" : value);
  const missingRounds = <MissingEndpoint endpoint="total_rounds w GET /stats/" />;

  const subtitle = (
    <>
      {formatCount(count)} {plural(count, VISITS)} na strzelnicę ·{" "}
      {fromStats(rounds === undefined ? missingRounds : `${formatCount(rounds)} ${plural(rounds, ROUNDS)}`)}
      {firstDate && ` · od ${formatMonthName(firstDate)}`}
    </>
  );

  const perRound =
    rounds === undefined ? missingRounds : rounds > 0 && ammo !== null && fees !== null ? formatAmount((ammo + fees) / rounds) : "—";

  const grouped = state.sort === "date_desc" || state.sort === "date_asc";
  const row = (training: Training) => (
    <TrainingRow
      key={training.id}
      training={training}
      showYear={!grouped}
      onOpen={() => navigate(`/trainings/${training.id}`, { state: { trainingsSearch: state.search } })}
      onEdit={() => setEditing(training)}
      onDelete={() => setDeleting(training)}
    />
  );
  const LIST = "m-0 mb-5 flex list-none flex-col gap-[7px] p-0";

  let content: ReactNode;
  if (state.calendar) {
    content = <TrainingCalendar month={state.month} weaponId={state.weaponId} onMonthChange={state.setMonth} backSearch={state.search} />;
  } else if (list.error) {
    content = <LoadError message={list.error.message} onRetry={() => void list.refetch()} />;
  } else if (list.isPending) {
    content = <p className="m-0 text-sm text-muted">Wczytywanie…</p>;
  } else if (list.data.total === 0) {
    content = (
      <div className="rounded-[11px] border border-line bg-card px-5 py-6 text-center">
        <p className="m-0 mb-4 text-sm font-[560]">Brak treningów z tą bronią</p>
        <Button variant="ghost" onClick={() => state.setWeapon("")}>
          Wyczyść filtr
        </Button>
      </div>
    );
  } else {
    content = (
      <div className={`transition-opacity ${list.isPlaceholderData ? "opacity-55" : ""}`}>
        {grouped ? (
          // While the next page loads, the rows still shown may be in another order and repeat a month,
          // so the month alone would not be a unique key.
          groupByMonth(list.data.items).map((group) => (
            <section key={`${group.month}-${group.rows[0]?.id}`}>
              <h2 className="mt-0 mr-0 mb-[9px] ml-[2px] text-[11.5px] font-semibold tracking-[0.08em] text-muted uppercase">
                {formatMonthTitle(group.month)}
              </h2>
              <ul className={LIST}>{group.rows.map(row)}</ul>
            </section>
          ))
        ) : (
          <ul className={LIST}>{list.data.items.map(row)}</ul>
        )}
        <Pagination
          page={state.page}
          count={pageCount}
          onChange={(next) => {
            state.setPage(next);
            window.scrollTo({ top: 0 });
          }}
        />
      </div>
    );
  }

  return (
    <Page title="Treningi" subtitle={subtitle} actions={<Button onClick={() => setAdding(true)}>Dodaj trening</Button>}>
      <SummaryTiles>
        <SummaryTile label="Amunicja" value={fromStats(formatAmount(ammo))} unit="zł" />
        <SummaryTile label="Wejścia" value={fromStats(formatAmount(fees))} unit="zł" />
        <SummaryTile label="Za strzał" value={fromStats(perRound)} unit="zł" accent />
      </SummaryTiles>

      <div className="mb-[18px] flex flex-wrap items-center gap-[9px]">
        <select aria-label="Filtr po broni" value={state.weaponId ?? ""} onChange={(event) => state.setWeapon(event.target.value)} className={SELECT}>
          <option value="">Wszystkie bronie</option>
          {weapons.data?.map((weapon) => (
            <option key={weapon.id} value={weapon.id}>
              {weapon.name}
              {weapon.is_active ? "" : " (wycofana)"}
            </option>
          ))}
        </select>
        {/* A calendar is always in date order, so sorting applies to the list only. */}
        <select
          aria-label="Sortowanie"
          value={state.sort}
          disabled={state.calendar}
          onChange={(event) => state.setSort(event.target.value as TrainingSort)}
          className={SELECT}
        >
          {TRAINING_SORTS.map((sort) => (
            <option key={sort} value={sort}>
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
        <ViewSwitch calendar={state.calendar} onChange={state.setCalendar} />
      </div>

      {content}
      {windows}
    </Page>
  );
}
