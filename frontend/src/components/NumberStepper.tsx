import { useEffect, useState } from "react";

interface NumberStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  id?: string;
  /** Names the field for assistive technology, e.g. "Liczba magazynków". */
  label: string;
}

/** Whole-number field with minus and plus buttons. */
export function NumberStepper({ value, onChange, min = 1, max, id, label }: NumberStepperProps) {
  // The text being typed; committed (and clamped) when the field loses focus.
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const clamp = (number: number) => Math.min(max ?? Infinity, Math.max(min, number));

  const commit = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const next = clamp(Number.isNaN(parsed) ? min : parsed);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };

  const stepButton =
    "h-[35px] w-[31px] cursor-pointer bg-card text-[15px] text-muted enabled:hover:bg-accent-soft enabled:hover:text-accent disabled:cursor-default disabled:opacity-55";

  return (
    <div className="inline-flex overflow-hidden rounded-[7px] border border-line">
      <button type="button" aria-label={`${label}: mniej`} className={stepButton} onClick={() => commit(String(value - 1))}>
        −
      </button>
      <input
        id={id}
        aria-label={label}
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(event) => setDraft(event.target.value.replace(/\D/g, ""))}
        onBlur={(event) => commit(event.target.value)}
        className="num w-[52px] bg-page px-[2px] py-[7px] text-center text-[15px] text-ink focus-visible:-outline-offset-2"
      />
      <button type="button" aria-label={`${label}: więcej`} className={stepButton} onClick={() => commit(String(value + 1))}>
        +
      </button>
    </div>
  );
}
