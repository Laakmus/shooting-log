import { Link } from "react-router-dom";
import { formatMonthTitle, toIso, todayIso } from "../api/format";
import { type Training, useTrainingsMonth } from "../api/trainings";
import { LoadError } from "./LoadError";

const WEEKDAYS = ["pon", "wt", "śr", "czw", "pt", "sob", "nd"] as const;

/** "2026-09" moved by a number of months, e.g. -1 gives "2026-08". */
export function shiftMonth(month: string, delta: number): string {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  return toIso(new Date(year, monthNumber - 1 + delta, 1)).slice(0, 7);
}

/** Every day shown in the grid: whole weeks from Monday, padded with days of the neighbouring months. */
function gridDays(month: string): string[] {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  const leading = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_unused, index) => toIso(new Date(year, monthNumber - 1, 1 - leading + index)));
}

/** Place on top, weapon models below. The number of rounds is deliberately not shown. */
function TrainingLabel({ training }: { training: Training }) {
  return (
    <>
      <span className="line-clamp-2 text-xs leading-[1.25] font-[580] [overflow-wrap:anywhere] max-[620px]:text-[9.5px]">
        {training.place ?? "—"}
      </span>
      <span className="mt-1 line-clamp-2 text-[9.5px] leading-[1.35] text-muted group-hover/training:text-on-accent max-[620px]:hidden">
        {training.weapons.length > 0 ? training.weapons.map((weapon) => weapon.name).join(" · ") : "jeszcze bez broni"}
      </span>
    </>
  );
}

const trainingName = (training: Training) => `Trening ${training.training_date}${training.place ? `, ${training.place}` : ""}`;

interface DayProps {
  date: string;
  outside: boolean;
  today: boolean;
  trainings: Training[];
  /** Carried to the details view, so it can lead back to the same month and filter. */
  backSearch: string;
}

const CELL = "min-w-0 overflow-hidden border-r border-b border-line px-2 py-[6px] nth-[7n]:border-r-0 max-[620px]:px-1";
const CELL_USED = "border-t-[3px] border-t-accent bg-accent-soft pt-1";
const HOVER = "hover:bg-accent hover:text-on-accent";

function Day({ date, outside, today, trainings, backSearch }: DayProps) {
  const used = trainings.length > 0;
  const number = (
    <span
      className={`text-xs tabular-nums ${
        today
          ? "grid h-5 w-5 place-items-center rounded-full bg-ink font-semibold text-page"
          : used
            ? "font-semibold text-accent group-hover/training:text-on-accent"
            : `text-muted ${outside ? "opacity-35" : ""}`
      }`}
    >
      {Number(date.slice(8))}
    </span>
  );
  const target = (training: Training) => ({ pathname: `/trainings/${training.id}` });
  const state = { trainingsSearch: backSearch };

  // A single training: the whole cell is the link, as in the mockup.
  const [only] = trainings;
  if (trainings.length === 1 && only) {
    return (
      <Link
        to={target(only)}
        state={state}
        aria-label={trainingName(only)}
        className={`group/training block text-ink no-underline focus-visible:-outline-offset-2 ${CELL} ${CELL_USED} ${HOVER}`}
      >
        {number}
        <span className="mt-1 block">
          <TrainingLabel training={only} />
        </span>
      </Link>
    );
  }

  // Several trainings on one day: each one below the other, each with its own link.
  return (
    <div className={`${CELL} ${used ? CELL_USED : ""}`}>
      {number}
      {trainings.map((training) => (
        <Link
          key={training.id}
          to={target(training)}
          state={state}
          aria-label={trainingName(training)}
          className={`group/training -mx-1 mt-1 block rounded-[5px] border-t border-line px-1 py-[3px] text-ink no-underline first-of-type:border-t-0 focus-visible:-outline-offset-2 ${HOVER}`}
        >
          <TrainingLabel training={training} />
        </Link>
      ))}
    </div>
  );
}

interface TrainingCalendarProps {
  /** "2026-09" */
  month: string;
  weaponId?: number;
  onMonthChange: (month: string) => void;
  backSearch: string;
}

/** Month grid with the trainings of the visible month. */
export function TrainingCalendar({ month, weaponId, onMonthChange, backSearch }: TrainingCalendarProps) {
  const { data, error, isPending, isPlaceholderData, refetch } = useTrainingsMonth(month, weaponId);

  const byDay = new Map<string, Training[]>();
  // While the next month loads, the previous month's rows are still in `data`; they are not drawn.
  for (const training of isPlaceholderData ? [] : (data?.items ?? [])) {
    byDay.set(training.training_date, [...(byDay.get(training.training_date) ?? []), training]);
  }
  const today = todayIso();
  const arrow =
    "h-7 w-7 flex-none cursor-pointer rounded-[7px] border border-line bg-card text-xs text-muted hover:border-accent hover:text-accent";

  return (
    <div>
      {/* The name has a fixed width, so the arrows stay in place whatever the month is called. */}
      <div className="mb-3 flex items-center gap-[5px]">
        <button type="button" aria-label="Poprzedni miesiąc" className={arrow} onClick={() => onMonthChange(shiftMonth(month, -1))}>
          ‹
        </button>
        <h2 className="m-0 w-[148px] flex-none text-center text-[15px] font-[620] whitespace-nowrap" aria-live="polite">
          {formatMonthTitle(month)}
        </h2>
        <button type="button" aria-label="Następny miesiąc" className={arrow} onClick={() => onMonthChange(shiftMonth(month, 1))}>
          ›
        </button>
        {isPending || isPlaceholderData ? <span className="ml-2 truncate text-xs text-muted">Wczytywanie…</span> : null}
      </div>

      {error ? (
        <LoadError message={error.message} onRetry={() => void refetch()} />
      ) : (
        <div className="overflow-hidden rounded-[11px] border border-line bg-card shadow-card">
          <div className="grid grid-cols-7 border-b border-line">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-[2px] py-[7px] text-center text-[10.5px] font-semibold tracking-[0.05em] text-muted uppercase">
                {day}
              </div>
            ))}
          </div>
          <div className="-mb-px grid auto-rows-[minmax(92px,auto)] grid-cols-7 max-[620px]:auto-rows-[minmax(64px,auto)]">
            {gridDays(month).map((date) => (
              <Day
                key={date}
                date={date}
                outside={!date.startsWith(month)}
                today={date === today}
                trainings={date.startsWith(month) ? (byDay.get(date) ?? []) : []}
                backSearch={backSearch}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
