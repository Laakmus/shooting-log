import { Button } from "./Button";

const STEPS = [
  ["Dodaj broń", "Własną albo klubową — tę, z której strzelasz na strzelnicy"],
  ["Zapisz trening", "Data, miejsce i koszt wejścia"],
  ["Dopisz, z czego strzelałeś", "Magazynki albo pociski — liczby przeliczą się same"],
] as const;

interface EmptyStateProps {
  text: string;
  actionLabel: string;
  onAction: () => void;
}

/** First-visit screen: the three steps of keeping the log and a button for the next one. */
export function EmptyState({ text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="mx-auto mt-[60px] max-w-[430px] text-center">
      <div aria-hidden="true" className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-[15px] bg-accent-soft text-[26px] text-accent">
        ◎
      </div>
      <h1 className="m-0 mb-2 text-[19px] font-[620]">Zacznij prowadzić dziennik</h1>
      <p className="m-0 mb-6 text-sm leading-[1.6] text-muted">{text}</p>
      <ol className="m-0 mb-[22px] list-none rounded-[11px] border border-line bg-card px-1 py-[6px] text-left shadow-card">
        {STEPS.map(([title, description], index) => (
          <li key={title} className="grid grid-cols-[26px_1fr] items-start gap-3 border-line px-[14px] py-[11px] not-first:border-t">
            <span className="num mt-px grid h-[22px] w-[22px] place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">
              {index + 1}
            </span>
            <div>
              <div className="mb-[2px] text-[13.5px] font-[560]">{title}</div>
              <div className="text-xs leading-[1.45] text-muted">{description}</div>
            </div>
          </li>
        ))}
      </ol>
      <Button onClick={onAction}>{actionLabel}</Button>
    </div>
  );
}
