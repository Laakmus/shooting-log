import { Link } from "react-router-dom";
import { formatCount, plural } from "../api/format";
import type { WeaponDetail } from "../api/weapons";
import { Tag } from "./Tag";

const SESSIONS = ["trening", "treningi", "treningów"] as const;

/** Weapons from the most used one; the bar is relative to the highest round count. Unused weapons close the list. */
export function WeaponRanking({ weapons }: { weapons: WeaponDetail[] }) {
  const ranked = [...weapons].sort((a, b) => b.total_rounds - a.total_rounds || a.name.localeCompare(b.name, "pl"));
  const most = ranked[0]?.total_rounds ?? 0;

  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {ranked.map((weapon) => (
        <li key={weapon.id}>
          <Link
            to={`/weapons/${weapon.id}`}
            className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border border-line bg-card px-4 py-[13px] text-ink no-underline shadow-card transition-[border-color,background-color] duration-[160ms] hover:border-accent hover:bg-accent-soft ${weapon.is_active && weapon.total_rounds > 0 ? "" : "opacity-55"}`}
          >
            <div className="min-w-0">
              <div className="mb-[6px] flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-sm font-[560] [overflow-wrap:anywhere]">{weapon.name}</span>
                {!weapon.is_owned && <Tag>klubowa</Tag>}
                {!weapon.is_active && <Tag muted>wycofana</Tag>}
              </div>
              <div className="h-[6px] overflow-hidden rounded-[3px] bg-line">
                <span
                  data-ranking-bar
                  className="block h-full bg-accent opacity-70"
                  style={{ width: `${most > 0 ? (weapon.total_rounds / most) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="min-w-[96px] text-right">
              <div className="num text-[19px] leading-none font-[640]">
                {formatCount(weapon.total_rounds)}
                <span className="ml-[3px] text-[10px] font-medium text-muted">poc.</span>
              </div>
              <div className="mt-[3px] text-[11px] text-muted tabular-nums">
                {weapon.total_rounds > 0
                  ? `${formatCount(weapon.sessions_count)} ${plural(weapon.sessions_count, SESSIONS)}`
                  : "nieużywana"}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ol>
  );
}
