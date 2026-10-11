import type { ReactNode } from "react";

/** Small label next to a name: "klubowa" (accent) or "wycofana" (muted). */
export function Tag({ muted, children }: { muted?: boolean; children: ReactNode }) {
  return (
    <span
      className={`rounded-[5px] px-2 py-[2px] text-[11px] font-[560] whitespace-nowrap ${muted ? "bg-line text-muted" : "bg-accent-soft text-accent"}`}
    >
      {children}
    </span>
  );
}
