import type { Entry } from "./trainings";

export type EntryMode = "magazines" | "rounds";

/**
 * How an entry was counted. The backend fills in magazines for every entry, so the only trace of
 * "loose rounds" is a round count that is not a whole number of magazines.
 */
export function entryMode(entry: Entry): EntryMode {
  const { magazines_count: magazines, rounds_per_magazine: perMagazine } = entry;
  return magazines != null && perMagazine != null && magazines * perMagazine === entry.rounds_fired ? "magazines" : "rounds";
}

/**
 * Rounds in each magazine of an entry, in shooting order.
 * Loose rounds are split into full magazines and one last, partly filled magazine.
 */
export function magazineLoads(entry: Entry, capacity: number): number[] {
  const size = Math.max(1, entry.rounds_per_magazine ?? capacity);
  if (entryMode(entry) === "magazines") return Array<number>(entry.magazines_count ?? 0).fill(size);
  const rest = entry.rounds_fired % size;
  const loads = Array<number>(Math.floor(entry.rounds_fired / size)).fill(size);
  if (rest > 0) loads.push(rest);
  return loads;
}

/** Price of one round: digits with up to four decimals, comma or dot. */
const PRICE = /^\d{1,6}([.,]\d{1,4})?$/;

export function isPrice(text: string): boolean {
  return PRICE.test(text.trim());
}

/**
 * Cost of a portion in grosze: price per round × rounds, rounded to a whole grosz.
 * Counted on whole numbers (price in 1/10000 zł), so 5,40 × 45 is exactly 243,00.
 */
export function portionCents(price: string, rounds: number): number {
  const [whole = "0", fraction = ""] = price.trim().replace(",", ".").split(".");
  const units = Number(whole) * 10_000 + Number(fraction.padEnd(4, "0"));
  return Math.round((units * rounds) / 100);
}

/** Grosze as the decimal string the API expects: 24300 → "243.00". */
export function centsToApi(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Price per round behind a saved entry ("5,40"); empty when the entry has no cost. */
export function entryPrice(entry: Entry): string {
  if (entry.ammo_cost == null || entry.rounds_fired <= 0) return "";
  const price = Number(entry.ammo_cost) / entry.rounds_fired;
  if (!Number.isFinite(price)) return "";
  // Two decimals when that is exact, otherwise up to four.
  const text = price.toFixed(4).replace(/0{1,2}$/, "");
  return text.replace(".", ",");
}
