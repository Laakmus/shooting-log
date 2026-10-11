import { useLayoutEffect, useRef, type ReactNode } from "react";
import { formatCount, formatShortMonth } from "../api/format";
import { formatAmount, toNumber } from "../api/money";
import type { MonthlyCost } from "../api/stats";

const HEAD = "sticky left-0 bg-card py-[6px] pr-3 text-left font-sans text-[11px] font-normal text-muted";
const CELL = "px-[10px] py-[6px] text-center whitespace-nowrap";
const TOTAL = "border-t border-line pt-[7px] font-[640]";

/**
 * Costs month by month: one column per month, no summary column (totals belong to the tiles).
 * With many months the table scrolls sideways inside its own frame, starting at the latest month.
 */
export function MonthlyCostTable({ months }: { months: MonthlyCost[] }) {
  const frame = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (frame.current) frame.current.scrollLeft = frame.current.scrollWidth;
  }, [months.length]);

  const row = (label: string, cell: (month: MonthlyCost) => ReactNode, className = "") => (
    <tr>
      <th scope="row" className={`${HEAD} ${className}`}>
        {label}
      </th>
      {months.map((month) => (
        <td key={month.month} className={`${CELL} ${className}`}>
          {cell(month)}
        </td>
      ))}
    </tr>
  );

  return (
    <div ref={frame} role="region" aria-label="Koszty według miesięcy" tabIndex={0} className="overflow-x-auto rounded-[6px]">
      <table className="num w-full border-separate border-spacing-0 text-[11.5px]">
        <thead>
          <tr>
            <th className={HEAD}>
              <span className="sr-only">Miesiąc</span>
            </th>
            {months.map((month) => (
              <th key={month.month} scope="col" className={`${CELL} font-sans text-[10.5px] font-normal tracking-[0.04em] text-muted`}>
                <span className="uppercase">{formatShortMonth(month.month)}</span> {month.month.slice(0, 4)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {row("amunicja", (month) => formatAmount(month.ammo_cost), "font-semibold text-accent")}
          {row("wejścia", (month) => formatAmount(month.training_sessions_cost), "font-semibold text-accent2")}
          {row("treningi", (month) => formatCount(month.sessions_count))}
          {row(
            "razem",
            (month) => formatAmount((toNumber(month.ammo_cost) ?? 0) + (toNumber(month.training_sessions_cost) ?? 0)),
            TOTAL,
          )}
        </tbody>
      </table>
    </div>
  );
}
