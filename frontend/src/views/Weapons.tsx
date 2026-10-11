import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatCount, formatMonth, plural } from "../api/format";
import { formatMoney } from "../api/money";
import { costPerRound, useWeapons, type WeaponDetail } from "../api/weapons";
import { Button } from "../components/Button";
import { IconButton } from "../components/IconButton";
import { LoadError } from "../components/LoadError";
import { Page } from "../components/Page";
import { RetireWeaponDialog } from "../components/RetireWeaponDialog";
import { Tag } from "../components/Tag";
import { WeaponFormModal } from "../components/WeaponFormModal";

const ROUNDS = ["pocisk", "pociski", "pocisków"] as const;
const SESSIONS = ["trening", "treningi", "treningów"] as const;

function summary(weapons: WeaponDetail[]): string {
  const active = weapons.filter((weapon) => weapon.is_active).length;
  const retired = weapons.length - active;
  const rounds = weapons.reduce((sum, weapon) => sum + weapon.total_rounds, 0);
  return [
    `${active} ${plural(active, ["aktywna", "aktywne", "aktywnych"])}`,
    `${retired} ${plural(retired, ["wycofana", "wycofane", "wycofanych"])}`,
    `łącznie ${formatCount(rounds)} ${plural(rounds, ROUNDS)}`,
  ].join(" · ");
}

function purchaseText(weapon: WeaponDetail) {
  const parts = [];
  if (weapon.purchase_price != null) parts.push(<b key="price" className="font-semibold text-ink">{formatMoney(weapon.purchase_price)}</b>);
  if (weapon.purchase_date) parts.push(<span key="date">{parts.length > 0 ? " · " : ""}{formatMonth(weapon.purchase_date)}</span>);
  return parts.length > 0 ? parts : "nie podano";
}

interface WeaponCardProps {
  weapon: WeaponDetail;
  onOpen: () => void;
  onEdit: () => void;
  onRetire: () => void;
}

function WeaponCard({ weapon, onOpen, onEdit, onRetire }: WeaponCardProps) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className={`group relative flex cursor-pointer flex-col rounded-[10px] border border-line bg-card px-[18px] py-4 shadow-card transition-[border-color,background-color] duration-[160ms] hover:border-accent hover:bg-accent-soft ${weapon.is_active ? "" : "opacity-55"}`}
    >
      {/* Hidden until the card is hovered or focused; always visible on touch screens. */}
      <div className="absolute top-[13px] right-[14px] flex gap-[5px] opacity-0 transition-opacity duration-[160ms] group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <IconButton label={`Edytuj ${weapon.name}`} onClick={onEdit}>
          ✎
        </IconButton>
        {weapon.is_active && (
          <IconButton label={`Wycofaj ${weapon.name}`} onClick={onRetire}>
            ✕
          </IconButton>
        )}
      </div>

      <div className="mb-[2px] flex flex-wrap items-center gap-x-[10px] gap-y-1 [@media(hover:none)]:pr-[66px]">
        <span className="text-base font-[620] tracking-[-0.01em] [overflow-wrap:anywhere]">{weapon.name}</span>
        {!weapon.is_owned && <Tag>klubowa</Tag>}
        {!weapon.is_active && <Tag muted>wycofana</Tag>}
      </div>
      <div className="mb-[13px] text-xs text-muted">
        magazynek na <span className="num">{weapon.magazine_capacity}</span>
        {weapon.is_owned && " · własna"}
      </div>

      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <span className="num text-[28px] leading-none font-[640] tracking-[-0.03em]">
          {formatCount(weapon.total_rounds)}
          <span className="ml-1 text-[11px] font-medium tracking-normal text-muted">poc.</span>
        </span>
        <span className="num text-[15px] leading-none font-semibold text-muted">
          {weapon.sessions_count === 0
            ? "nieużywana"
            : `${formatCount(weapon.sessions_count)} ${plural(weapon.sessions_count, SESSIONS)}`}
        </span>
      </div>
      <div className="num mt-[10px] mb-[13px] flex flex-wrap items-baseline gap-[5px] text-[12.5px] leading-none font-medium">
        <span className="text-[11.5px] text-muted">{weapon.is_owned ? "za strzał z bronią" : "za strzał"}</span>
        {formatMoney(costPerRound(weapon))}
      </div>

      <div className="mt-auto flex justify-between gap-2 border-t border-line pt-[10px] text-[11.5px] text-muted tabular-nums">
        {weapon.is_owned ? (
          <>
            <span>Zakup</span>
            <span className="text-right">{purchaseText(weapon)}</span>
          </>
        ) : (
          <>
            <span>Broń strzelnicy</span>
            <span className="text-right">bez kosztu zakupu</span>
          </>
        )}
      </div>
    </li>
  );
}

const STEPS = [
  ["Dodaj broń", "Własną albo klubową — tę, z której strzelasz na strzelnicy"],
  ["Zapisz trening", "Data, miejsce i koszt wejścia"],
  ["Dopisz, z czego strzelałeś", "Magazynki albo pociski — liczby przeliczą się same"],
] as const;

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="mx-auto mt-[60px] max-w-[430px] text-center">
      <div aria-hidden="true" className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-[15px] bg-accent-soft text-[26px] text-accent">
        ◎
      </div>
      <h1 className="m-0 mb-2 text-[19px] font-[620]">Zacznij prowadzić dziennik</h1>
      <p className="m-0 mb-6 text-sm leading-[1.6] text-muted">
        Nie masz jeszcze żadnej broni. Zapisuj, ile wystrzeliłeś i ile to kosztowało — reszta policzy się sama.
      </p>
      <ol className="m-0 mb-[22px] list-none rounded-[11px] border border-line bg-card px-1 py-[6px] text-left shadow-card">
        {STEPS.map(([title, description], index) => (
          <li key={title} className="grid grid-cols-[26px_1fr] items-start gap-3 border-line px-[14px] py-[11px] not-first:border-t">
            <span className="num mt-px grid h-[22px] w-[22px] place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
              {index + 1}
            </span>
            <div>
              <div className="mb-[2px] text-[13.5px] font-[560]">{title}</div>
              <div className="text-xs leading-[1.45] text-muted">{description}</div>
            </div>
          </li>
        ))}
      </ol>
      <Button onClick={onAdd}>Dodaj pierwszą broń</Button>
    </div>
  );
}

export function Weapons() {
  const navigate = useNavigate();
  const { data: weapons, isPending, error, refetch } = useWeapons();

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<WeaponDetail | null>(null);
  const [retiring, setRetiring] = useState<WeaponDetail | null>(null);

  const windows = (
    <>
      <WeaponFormModal open={adding} onClose={() => setAdding(false)} />
      <WeaponFormModal open={editing !== null} weapon={editing ?? undefined} onClose={() => setEditing(null)} />
      <RetireWeaponDialog weapon={retiring} onClose={() => setRetiring(null)} />
    </>
  );

  if (error) {
    return (
      <Page title="Moja broń" subtitle="Lista broni jest chwilowo niedostępna.">
        <LoadError message={error.message} onRetry={() => void refetch()} />
      </Page>
    );
  }
  if (isPending) return <Page title="Moja broń" subtitle="Wczytywanie…" />;

  if (weapons.length === 0) {
    return (
      <Page>
        <EmptyState onAdd={() => setAdding(true)} />
        {windows}
      </Page>
    );
  }

  return (
    <Page title="Moja broń" subtitle={summary(weapons)} actions={<Button onClick={() => setAdding(true)}>Dodaj broń</Button>}>
      <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-[10px] p-0">
        {weapons.map((weapon) => (
          <WeaponCard
            key={weapon.id}
            weapon={weapon}
            onOpen={() => navigate(`/weapons/${weapon.id}`)}
            onEdit={() => setEditing(weapon)}
            onRetire={() => setRetiring(weapon)}
          />
        ))}
      </ul>
      {windows}
    </Page>
  );
}
