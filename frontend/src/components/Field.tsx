import type { ReactNode } from "react";

/** Shared look of text fields, selects and their labels inside a window. */
export const INPUT =
  "w-full rounded-[7px] border border-line bg-page px-3 py-[9px] text-[15px] text-ink focus:border-accent focus:outline-2 focus:-outline-offset-1 focus:outline-accent";
export const LABEL = "mb-[6px] block text-[12.5px] font-[560]";

/** Muted remark next to a label, e.g. "nieobowiązkowa". */
export function Hint({ children }: { children: ReactNode }) {
  return <span className="text-[11.5px] font-normal text-muted"> {children}</span>;
}
