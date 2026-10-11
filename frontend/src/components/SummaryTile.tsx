import type { ReactNode } from "react";

/** Row of summary tiles separated by hairlines. Four tiles fold into 2×2 on narrow screens. */
export function SummaryTiles({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[18px] grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-px overflow-hidden rounded-[11px] border border-line bg-line has-[>:nth-child(4)]:grid-cols-2 min-[820px]:has-[>:nth-child(4)]:grid-cols-4">
      {children}
    </div>
  );
}

interface SummaryTileProps {
  label: string;
  /** Usually a formatted number; may also be a <MissingEndpoint />. */
  value: ReactNode;
  unit?: string;
  accent?: boolean;
}

export function SummaryTile({ label, value, unit, accent }: SummaryTileProps) {
  return (
    <div className="bg-card px-[17px] py-[14px]">
      <div className="mb-1 text-[11.5px] text-muted">{label}</div>
      <div className={`num text-xl leading-none font-[640] tracking-[-0.02em] ${accent ? "text-accent" : ""}`}>{value}</div>
      {unit && <div className="mt-[5px] text-[11px] text-muted">{unit}</div>}
    </div>
  );
}
