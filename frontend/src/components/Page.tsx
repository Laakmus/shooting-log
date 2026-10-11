import type { ReactNode } from "react";

interface PageProps {
  /** Left out by views that draw their own heading. */
  title?: string;
  subtitle?: ReactNode;
  /** Buttons shown on the right of the heading. */
  actions?: ReactNode;
  children?: ReactNode;
}

/** Common frame of every view: centered column, heading, optional subtitle. */
export function Page({ title, subtitle, actions, children }: PageProps) {
  return (
    <section className="mx-auto max-w-[900px] animate-view-in px-7 pt-[30px] pb-20">
      {title && (
        <div className="mb-[6px] flex items-start justify-between gap-5">
          <h1 className="m-0 text-2xl font-[640] tracking-[-0.02em]">{title}</h1>
          {actions}
        </div>
      )}
      {subtitle && <p className="m-0 mb-6 text-sm text-muted">{subtitle}</p>}
      {children}
    </section>
  );
}
