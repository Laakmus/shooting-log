const NBSP = " ";

/** "1 240": whole number with thousands split by a non-breaking space. */
export function formatCount(value: number): string {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** Picks the Polish noun form for a number: 1 pocisk, 2 pociski, 5 pocisków. */
export function plural(count: number, forms: readonly [one: string, few: string, many: string]): string {
  const n = Math.abs(count);
  if (n === 1) return forms[0];
  const lastTwo = n % 100;
  const last = n % 10;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return forms[1];
  return forms[2];
}

/** ISO date "2026-03-14" as "03.2026". */
export function formatMonth(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return `${month}.${year}`;
}

const MONTHS_GENITIVE = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
] as const;

/** ISO date "2026-09-08" as "września 2026". */
export function formatMonthName(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  return `${MONTHS_GENITIVE[Number(month) - 1] ?? month} ${year}`;
}

/** ISO date "2026-09-08" as "8 września 2026". */
export function formatLongDate(isoDate: string): string {
  return `${Number(isoDate.split("-")[2])} ${formatMonthName(isoDate)}`;
}

/** Today's date in the browser's time zone as "YYYY-MM-DD" (the format of <input type="date">). */
export function todayIso(): string {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
