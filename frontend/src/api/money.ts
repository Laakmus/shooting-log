const NBSP = " ";

/** Decimal values arrive from the API as strings ("1234.50"). Returns null when there is no usable number. */
export function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

/** "1 234,50": two decimals, comma separator, thousands split with a non-breaking space. */
export function formatAmount(value: string | number | null | undefined): string {
  const number = toNumber(value);
  if (number === null) return "—";
  const [whole = "0", fraction = "00"] = Math.abs(number).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  const sign = number < 0 && Number(`${whole}.${fraction}`) !== 0 ? "-" : "";
  return `${sign}${grouped},${fraction}`;
}

/** "1 234,50 zł" */
export function formatMoney(value: string | number | null | undefined): string {
  const amount = formatAmount(value);
  return amount === "—" ? amount : `${amount}${NBSP}zł`;
}
