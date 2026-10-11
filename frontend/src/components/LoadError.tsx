import { Button } from "./Button";

/** Calm message shown when a view could not load its data, with a retry button. */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-[11px] border border-line bg-card px-5 py-6 text-center">
      <p className="m-0 mb-1 text-sm font-[560]">Nie udało się wczytać danych</p>
      <p className="m-0 mb-4 text-[13px] text-muted">{message}</p>
      <Button variant="ghost" onClick={onRetry}>
        Spróbuj ponownie
      </Button>
    </div>
  );
}
