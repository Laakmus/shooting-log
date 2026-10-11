import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { formatCount, formatLongDate, formatMonthName, plural } from "../api/format";
import { formatAmount, formatMoney, toNumber } from "../api/money";
import { costPerRound, useWeapon, useWeaponHistory, type WeaponHistoryItem } from "../api/weapons";
import { IconButton } from "../components/IconButton";
import { LoadError } from "../components/LoadError";
import { Page } from "../components/Page";
import { RetireWeaponDialog } from "../components/RetireWeaponDialog";
import { SummaryTile, SummaryTiles } from "../components/SummaryTile";
import { Tag } from "../components/Tag";
import { WeaponFormModal } from "../components/WeaponFormModal";

function BackLink() {
  return (
    <Link to="/weapons" className="mb-[14px] inline-flex items-center gap-[6px] text-sm text-muted no-underline hover:text-accent">
      ← Moja broń
    </Link>
  );
}

const ROUNDS = ["pocisk", "pociski", "pocisków"] as const;
const SESSIONS = ["trening", "treningi", "treningów"] as const;

/** "3 × 15 + 1 × 7"; an entry saved as loose rounds contributes just its round count. */
function magazinesText(entries: WeaponHistoryItem["entries"]): string {
  return entries
    .map((entry) =>
      entry.magazines_count != null && entry.rounds_per_magazine != null
        ? `${entry.magazines_count} × ${entry.rounds_per_magazine}`
        : formatCount(entry.rounds_fired),
    )
    .join(" + ");
}

/** Plain numbered list: the rows are only for reading, they lead nowhere and cannot be edited. */
function History({ items }: { items: WeaponHistoryItem[] }) {
  const rounds = items.reduce((sum, item) => sum + item.rounds_fired, 0);
  const cost = items.reduce((sum, item) => sum + (toNumber(item.ammo_cost) ?? 0), 0);
  return (
    <>
      <ol className="m-0 list-none border-t border-line p-0">
        {items.map((item, index) => (
          <li
            key={item.training_id}
            className="grid grid-cols-[26px_132px_minmax(0,1fr)_auto] items-baseline gap-[14px] border-b border-line px-[2px] py-[11px] max-[620px]:grid-cols-[24px_minmax(0,1fr)_auto] max-[620px]:gap-x-[10px] max-[620px]:gap-y-1"
          >
            <span className="num text-xs leading-none font-medium text-muted">{index + 1}.</span>
            <span className="text-[13px] tabular-nums max-[620px]:col-start-2 max-[620px]:text-xs max-[620px]:text-muted">
              {formatLongDate(item.training_date)}
            </span>
            <span className="text-[13.5px] font-[560] [overflow-wrap:anywhere] max-[620px]:col-start-2 max-[620px]:row-start-2">
              {item.place ?? <span className="font-normal text-muted">—</span>}
              <span className="mt-[2px] block text-[11.5px] font-normal text-muted tabular-nums">{magazinesText(item.entries)}</span>
            </span>
            <span className="text-right whitespace-nowrap max-[620px]:col-start-3 max-[620px]:row-span-2 max-[620px]:row-start-1 max-[620px]:self-center">
              <span className="num text-[15px] leading-none font-[640]">
                {formatCount(item.rounds_fired)}
                <span className="ml-[3px] text-[10px] font-medium text-muted">poc.</span>
              </span>
              <span className="mt-[3px] block text-[11.5px] text-muted tabular-nums">{formatMoney(item.ammo_cost)}</span>
            </span>
          </li>
        ))}
      </ol>
      <p className="mx-[2px] mt-[11px] mb-0 text-xs text-muted tabular-nums">
        Razem {formatCount(items.length)} {plural(items.length, SESSIONS)} · {formatCount(rounds)} {plural(rounds, ROUNDS)} ·{" "}
        {formatMoney(cost)}
      </p>
    </>
  );
}

export function WeaponDetails() {
  const { id } = useParams();
  const weaponId = /^\d+$/.test(id ?? "") ? Number(id) : Number.NaN;
  const { data: weapon, error, isPending, refetch } = useWeapon(weaponId);
  const history = useWeaponHistory(weaponId);

  const [editing, setEditing] = useState(false);
  const [retiring, setRetiring] = useState(false);

  const notFound = Number.isNaN(weaponId) || (error instanceof ApiError && error.status === 404);
  if (notFound) {
    return (
      <Page>
        <BackLink />
        <h1 className="m-0 mb-[6px] text-2xl font-[640] tracking-[-0.02em]">Nie ma takiej broni</h1>
        <p className="m-0 text-sm text-muted">Broń o tym numerze nie istnieje. Wróć do listy i wybierz inną.</p>
      </Page>
    );
  }
  if (error) {
    return (
      <Page>
        <BackLink />
        <LoadError message={error.message} onRetry={() => void refetch()} />
      </Page>
    );
  }
  if (isPending) {
    return (
      <Page>
        <BackLink />
        <p className="m-0 text-sm text-muted">Wczytywanie…</p>
      </Page>
    );
  }

  // The history arrives newest first, so the oldest training is the last row.
  const firstTraining = history.data?.at(-1)?.training_date;
  const perRound = costPerRound(weapon);

  return (
    <Page>
      <BackLink />
      <div className="mb-[6px] flex items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1">
            <h1 className="m-0 text-2xl font-[640] tracking-[-0.02em] [overflow-wrap:anywhere]">{weapon.name}</h1>
            {!weapon.is_owned && <Tag>klubowa</Tag>}
            {!weapon.is_active && <Tag muted>wycofana</Tag>}
          </div>
          <p className="m-0 mb-5 text-sm text-muted">
            magazynek na <span className="num">{weapon.magazine_capacity}</span>{" "}
            {plural(weapon.magazine_capacity, ROUNDS)} ·{" "}
            {weapon.is_owned ? "własna" : "broń strzelnicy"}
          </p>
        </div>
        <div className="flex gap-[7px]">
          <IconButton large label={`Edytuj ${weapon.name}`} onClick={() => setEditing(true)}>
            ✎
          </IconButton>
          {weapon.is_active && (
            <IconButton large label={`Wycofaj ${weapon.name}`} onClick={() => setRetiring(true)}>
              ✕
            </IconButton>
          )}
        </div>
      </div>

      <SummaryTiles>
        <SummaryTile label="Wystrzelone" value={formatCount(weapon.total_rounds)} unit={plural(weapon.total_rounds, ROUNDS)} />
        <SummaryTile
          label="Treningi"
          value={formatCount(weapon.sessions_count)}
          unit={firstTraining ? `od ${formatMonthName(firstTraining)}` : undefined}
        />
        <SummaryTile label="Amunicja" value={formatAmount(weapon.ammo_cost)} unit="zł łącznie" />
        <SummaryTile label="Za strzał" value={formatAmount(perRound)} unit={perRound === null ? undefined : "zł średnio"} accent />
      </SummaryTiles>

      <h2 className="mt-6 mb-3 text-[13px] font-semibold">Historia strzelania</h2>
      {history.error ? (
        <LoadError message={history.error.message} onRetry={() => void history.refetch()} />
      ) : history.isPending ? (
        <p className="m-0 border-t border-line pt-3 text-sm text-muted">Wczytywanie…</p>
      ) : history.data.length === 0 ? (
        <p className="m-0 border-t border-line pt-3 text-sm text-muted">
          Z tej broni nie było jeszcze strzelania. Historia pojawi się po dodaniu jej do treningu.
        </p>
      ) : (
        <History items={history.data} />
      )}

      <WeaponFormModal open={editing} weapon={weapon} onClose={() => setEditing(false)} />
      <RetireWeaponDialog weapon={retiring ? weapon : null} onClose={() => setRetiring(false)} />
    </Page>
  );
}
