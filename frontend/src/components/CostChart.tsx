import { useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { formatCount, formatLongDate, formatShortMonth, plural } from "../api/format";
import { formatAmount, formatMoney, toNumber } from "../api/money";
import type { ChartTraining } from "../api/stats";

export type CostSeries = "ammo" | "fees";

const HEIGHT = 200;
const TOP = 12;
const BOTTOM = 24;
const RIGHT = 10;
/** Approximate width of one character of the 10px monospace axis labels. */
const CHAR = 6.1;
const ROUNDS = ["pocisk", "pociski", "pocisków"] as const;

const dayStamp = (isoDate: string) => Date.parse(`${isoDate}T00:00:00Z`);

/** Grid step giving at most four lines: 1, 2 or 5 times a power of ten. */
function gridStep(max: number): number {
  const rough = max / 3;
  const power = 10 ** Math.floor(Math.log10(rough));
  return ([1, 2, 5, 10].find((factor) => factor * power >= rough) ?? 10) * power;
}

interface MonthTick {
  x: number;
  label: string;
}

/** The first day of every month between the two dates, plus the month the range starts in. */
function monthStarts(from: number, to: number): { stamp: number; iso: string }[] {
  const start = new Date(from);
  const months = [];
  for (let year = start.getUTCFullYear(), month = start.getUTCMonth(); ; month++) {
    const stamp = Date.UTC(year, month, 1);
    if (stamp > to) break;
    months.push({ stamp, iso: new Date(stamp).toISOString().slice(0, 10) });
  }
  return months;
}

interface CostChartProps {
  /** Oldest first; never empty. */
  trainings: ChartTraining[];
  series: CostSeries;
}

/**
 * Line chart with one point per training and a fixed readout below it.
 * The readout shows the point nearest to the pointer (or chosen with the arrow keys), the latest training otherwise.
 */
export function CostChart({ trainings, series }: CostChartProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = frame.current;
    if (!element) return;
    setWidth(element.clientWidth);
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const last = trainings.length - 1;
  const active = Math.min(picked ?? last, last);
  const values = trainings.map((training) => toNumber(series === "ammo" ? training.ammo_cost : training.cost) ?? 0);

  const step = gridStep(Math.max(...values) || 100);
  const top = Math.max(step, Math.ceil(Math.max(...values) / step - 1e-9) * step);
  const levels = Array.from({ length: Math.round(top / step) + 1 }, (_unused, index) => index * step);
  const levelLabel = (level: number) => `${Number.isInteger(level) ? formatCount(level) : formatAmount(level)} zł`;

  const left = Math.ceil(levelLabel(top).length * CHAR) + 8;
  const plotWidth = Math.max(width - left - RIGHT, 1);
  const bottom = HEIGHT - BOTTOM;

  const stamps = trainings.map((training) => dayStamp(training.training_date));
  const from = stamps[0] ?? 0;
  const span = (stamps[last] ?? from) - from;
  const xAt = (stamp: number) => (span === 0 ? left + plotWidth / 2 : left + ((stamp - from) / span) * plotWidth);
  const yAt = (value: number) => bottom - (value / top) * (bottom - TOP);
  const points = trainings.map((_training, index) => ({ x: xAt(stamps[index] ?? from), y: yAt(values[index] ?? 0) }));
  const path = points.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(" ");

  // Month names under the axis; a name is skipped when it would run into the previous one.
  const months = monthStarts(from, from + span).map(({ stamp, iso }) => ({ x: Math.max(xAt(stamp), left), stamp, iso }));
  const ticks: MonthTick[] = [];
  let freeFrom = -Infinity;
  for (const month of months) {
    const withYear = ticks.length === 0 || month.iso.slice(5, 7) === "01";
    const label = withYear ? `${formatShortMonth(month.iso)} ${month.iso.slice(0, 4)}` : formatShortMonth(month.iso);
    const labelWidth = label.length * CHAR;
    if (month.x < freeFrom || month.x + labelWidth > width) continue;
    ticks.push({ x: month.x, label });
    freeFrom = month.x + labelWidth + 10;
  }

  // Points shrink when they get crowded, so that ~80 trainings stay readable on a phone.
  const spacing = plotWidth / Math.max(last, 1);
  const radius = Math.min(4.2, Math.max(1.8, spacing * 0.32));
  const hollow = radius >= 3;

  /** The point nearest to the pointer horizontally; trainings of the same day are told apart by height. */
  function nearest(event: PointerEvent<SVGRectElement>): number {
    const box = frame.current?.getBoundingClientRect();
    const x = event.clientX - (box?.left ?? 0);
    const y = event.clientY - (box?.top ?? 0);
    let best = 0;
    points.forEach((point, index) => {
      const chosen = points[best] ?? point;
      const closer = Math.abs(point.x - x) - Math.abs(chosen.x - x);
      if (closer < -0.5 || (closer <= 0.5 && Math.abs(point.y - y) <= Math.abs(chosen.y - y))) best = index;
    });
    return best;
  }

  function onKeyDown(event: KeyboardEvent) {
    const target =
      event.key === "ArrowLeft" || event.key === "ArrowDown"
        ? active - 1
        : event.key === "ArrowRight" || event.key === "ArrowUp"
          ? active + 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? last
              : null;
    if (target === null) return;
    event.preventDefault();
    setPicked(Math.min(Math.max(target, 0), last));
  }

  const training = trainings[active];
  const point = points[active];
  if (!training || !point) return null;

  const value = values[active] ?? 0;
  const amount = series === "fees" && value === 0 ? "za darmo" : formatMoney(value);
  const seriesLabel = series === "ammo" ? "Amunicja" : "Wejście";
  const colour = series === "ammo" ? "var(--accent)" : "var(--accent2)";

  return (
    <>
      <div
        ref={frame}
        role="slider"
        tabIndex={0}
        aria-label="Trening na wykresie"
        aria-valuemin={1}
        aria-valuemax={trainings.length}
        aria-valuenow={active + 1}
        aria-valuetext={`${formatLongDate(training.training_date)}, ${training.place ?? "bez miejsca"}, ${formatCount(training.total_rounds)} ${plural(training.total_rounds, ROUNDS)}, ${seriesLabel.toLowerCase()} ${amount}`}
        onKeyDown={onKeyDown}
        className="rounded-[6px]"
        style={{ height: HEIGHT, color: colour }}
      >
        {width > 0 && (
          <svg width={width} height={HEIGHT} aria-hidden="true" className="block overflow-visible">
            {levels.map((level) => (
              <g key={level}>
                <line
                  x1={left}
                  x2={width - RIGHT}
                  y1={yAt(level)}
                  y2={yAt(level)}
                  stroke="var(--line)"
                  strokeDasharray={level === 0 ? undefined : "3 4"}
                  opacity={level === 0 ? 1 : 0.7}
                />
                <text x={left - 8} y={yAt(level) + 3.5} textAnchor="end" fill="var(--muted)" className="num text-[10px]">
                  {levelLabel(level)}
                </text>
              </g>
            ))}
            {months.map((month) => (
              <line key={month.iso} x1={xAt(month.stamp)} x2={xAt(month.stamp)} y1={bottom} y2={bottom + 4} stroke="var(--line)" visibility={month.stamp < from ? "hidden" : undefined} />
            ))}
            {ticks.map((tick) => (
              <text key={tick.x} x={tick.x} y={HEIGHT - 6} fill="var(--muted)" className="text-[10px]">
                {tick.label}
              </text>
            ))}

            {last > 0 && (
              <>
                <polygon points={`${path} ${points[last]?.x.toFixed(1)},${bottom} ${points[0]?.x.toFixed(1)},${bottom}`} fill="currentColor" opacity={0.07} />
                <polyline points={path} fill="none" stroke="currentColor" strokeWidth={hollow ? 2.2 : 1.6} strokeLinejoin="round" strokeLinecap="round" />
              </>
            )}
            <line x1={point.x} x2={point.x} y1={TOP} y2={bottom} stroke="var(--muted)" opacity={0.3} />
            <g data-chart-points>
              {points.map((item, index) => (
                <circle
                  key={trainings[index]?.id}
                  cx={item.x}
                  cy={item.y}
                  r={radius}
                  fill={hollow ? "var(--card)" : "currentColor"}
                  stroke="currentColor"
                  strokeWidth={hollow ? 2.2 : 0}
                />
              ))}
            </g>
            <circle data-chart-active cx={point.x} cy={point.y} r={6.2} fill="var(--card)" stroke="currentColor" strokeWidth={2.4} />
            <rect
              x={left - 8}
              y={0}
              width={plotWidth + 8 + RIGHT}
              height={bottom + 4}
              fill="transparent"
              className="cursor-pointer"
              onPointerMove={(event) => setPicked(nearest(event))}
              onPointerDown={(event) => setPicked(nearest(event))}
              onPointerLeave={(event) => {
                // A finger lifted from the screen keeps its point; a mouse that left returns to the latest training.
                if (event.pointerType === "mouse" && document.activeElement !== frame.current) setPicked(null);
              }}
            />
          </svg>
        )}
      </div>

      <div
        data-chart-readout
        className="mt-[14px] grid grid-cols-2 items-end gap-x-[18px] gap-y-[10px] border-t border-line pt-[13px] min-[520px]:min-h-[56px] min-[520px]:grid-cols-[minmax(0,1fr)_auto_auto] min-[520px]:items-center"
      >
        {/* On a phone the date takes its own row, so that it is never cut short. */}
        <div className="col-span-2 min-w-0 min-[520px]:col-span-1">
          <div className="truncate text-[15px] font-[620]">{formatLongDate(training.training_date)}</div>
          <div className="mt-px truncate text-xs text-muted">{training.place ?? "—"}</div>
        </div>
        <div className="min-w-[52px] min-[520px]:text-right">
          <div className="mb-[3px] text-[11px] text-muted">Pociski</div>
          <div className="num text-base leading-none font-[640] text-muted">{formatCount(training.total_rounds)}</div>
        </div>
        <div className="min-w-[96px] text-right min-[520px]:min-w-[136px]">
          <div className="mb-[3px] text-[11px] text-muted">{seriesLabel}</div>
          <div className="num text-[17px] leading-none font-[640] whitespace-nowrap min-[520px]:text-xl" style={{ color: colour }}>
            {amount}
          </div>
        </div>
      </div>
    </>
  );
}
