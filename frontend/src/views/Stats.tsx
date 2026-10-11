import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { formatCount, formatMonthName, plural } from "../api/format";
import { formatAmount, toNumber } from "../api/money";
import { useChartTrainings, useStats } from "../api/stats";
import { useWeapons } from "../api/weapons";
import { CostChart, type CostSeries } from "../components/CostChart";
import { LoadError } from "../components/LoadError";
import { MonthlyCostTable } from "../components/MonthlyCostTable";
import { Page } from "../components/Page";
import { SummaryTile, SummaryTiles } from "../components/SummaryTile";
import { WeaponRanking } from "../components/WeaponRanking";

const ROUNDS = ["pocisk", "pociski", "pocisków"] as const;
const SESSIONS = ["trening", "treningi", "treningów"] as const;
const MONTHS = ["miesiąc", "miesiące", "miesięcy"] as const;
const WEAPONS = ["broń", "bronie", "broni"] as const;

interface SwitchProps<T extends string> {
  label: string;
  value: T;
  options: readonly (readonly [value: T, label: string])[];
  onChange: (value: T) => void;
  /** Draws a dot before each label, like a chart legend. */
  dots?: boolean;
  /** Keeps the place in the layout but takes the switch out of sight and out of reach. */
  hidden?: boolean;
}

/** Two joined buttons of which exactly one is chosen. */
function Switch<T extends string>({ label, value, options, onChange, dots, hidden }: SwitchProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      aria-hidden={hidden || undefined}
      className={`flex overflow-hidden rounded-[7px] border border-line ${hidden ? "invisible" : ""}`}
    >
      {options.map(([option, text]) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`flex cursor-pointer items-center gap-[6px] px-[13px] py-[5px] text-[12.5px] font-[560] not-first:border-l not-first:border-line focus-visible:-outline-offset-2 ${value === option ? "bg-accent text-on-accent" : "bg-page text-muted hover:text-accent"}`}
        >
          {dots && <i aria-hidden="true" className={`h-2 w-2 rounded-full bg-current ${value === option ? "" : "opacity-55"}`} />}
          {text}
        </button>
      ))}
    </div>
  );
}

const SERIES = [
  ["ammo", "Amunicja"],
  ["fees", "Wejścia"],
] as const;
const MODES = [
  ["chart", "Wykres"],
  ["table", "Tabela"],
] as const;

const sectionTitle = (text: string): ReactNode => <h2 className="mt-6 mb-3 text-[13px] font-semibold">{text}</h2>;

export function Stats() {
  const stats = useStats();
  const trainings = useChartTrainings();
  const weapons = useWeapons();

  const [series, setSeries] = useState<CostSeries>("ammo");
  const [mode, setMode] = useState<"chart" | "table">("chart");

  const failed = [stats, trainings, weapons].filter((query) => query.error);
  if (failed[0]?.error) {
    return (
      <Page title="Statystyki" subtitle="Statystyki są chwilowo niedostępne.">
        <LoadError message={failed[0].error.message} onRetry={() => failed.forEach((query) => void query.refetch())} />
      </Page>
    );
  }
  if (!stats.data || !trainings.data || !weapons.data) return <Page title="Statystyki" subtitle="Wczytywanie…" />;

  const { total, monthly } = stats.data;
  const count = trainings.data.length;
  const firstDate = trainings.data[0]?.training_date;
  // The equipment sum is made of purchase prices, so only weapons that have one are counted.
  const bought = weapons.data.filter((weapon) => toNumber(weapon.purchase_price) !== null).length;
  const running = (toNumber(total.ammo_cost) ?? 0) + (toNumber(total.training_sessions_cost) ?? 0);
  const perRound = total.total_rounds > 0 ? running / total.total_rounds : null;

  const subtitle =
    count === 0
      ? "Jeszcze bez treningów."
      : `${formatCount(count)} ${plural(count, SESSIONS)} · ${formatCount(total.total_rounds)} ${plural(total.total_rounds, ROUNDS)}${firstDate ? ` · od ${formatMonthName(firstDate)}` : ""}`;

  return (
    <Page title="Statystyki" subtitle={subtitle}>
      <SummaryTiles>
        <SummaryTile label="Amunicja" value={formatAmount(total.ammo_cost)} unit={`zł, ${formatCount(monthly.length)} ${plural(monthly.length, MONTHS)}`} />
        <SummaryTile label="Wejścia" value={formatAmount(total.training_sessions_cost)} unit={`zł, ${formatCount(count)} ${plural(count, SESSIONS)}`} />
        <SummaryTile label="Sprzęt" value={formatAmount(total.equipment_cost)} unit={`zł, ${formatCount(bought)} ${plural(bought, WEAPONS)}`} />
        <SummaryTile label="Za strzał" value={formatAmount(perRound)} unit={perRound === null ? undefined : "zł bez sprzętu"} accent />
      </SummaryTiles>

      {sectionTitle("Koszty w czasie")}
      {count === 0 ? (
        <div className="rounded-[11px] border border-line bg-card px-5 py-7 text-center shadow-card">
          <p className="m-0 mb-1 text-sm font-[560]">Nie ma jeszcze czego pokazać</p>
          <p className="m-0 text-[13px] text-muted">
            Wykres i tabela pojawią się po zapisaniu pierwszego treningu.{" "}
            <Link to="/trainings" className="text-accent">
              Przejdź do treningów
            </Link>
          </p>
        </div>
      ) : (
        <div className="rounded-[11px] border border-line bg-card px-3 pt-[14px] pb-4 shadow-card min-[520px]:px-5">
          <div className="mb-[14px] flex min-h-8 flex-wrap items-center justify-between gap-x-[14px] gap-y-2" data-chart-toolbar>
            <Switch label="Seria wykresu" value={series} options={SERIES} onChange={setSeries} dots hidden={mode === "table"} />
            <div className="ml-auto">
              <Switch label="Sposób wyświetlania" value={mode} options={MODES} onChange={setMode} />
            </div>
          </div>
          {mode === "chart" ? <CostChart trainings={trainings.data} series={series} /> : <MonthlyCostTable months={monthly} />}
        </div>
      )}

      {weapons.data.length > 0 && (
        <>
          {sectionTitle("Broń według przebiegu")}
          <WeaponRanking weapons={weapons.data} />
        </>
      )}
    </Page>
  );
}
