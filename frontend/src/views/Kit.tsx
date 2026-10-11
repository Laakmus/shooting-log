import { type ReactNode, useState } from "react";
import { formatAmount, formatMoney } from "../api/money";
import { Button } from "../components/Button";
import { ConfirmDelete } from "../components/ConfirmDelete";
import { FormError } from "../components/FormError";
import { MissingEndpoint } from "../components/MissingEndpoint";
import { Modal, ModalActions, ModalBody } from "../components/Modal";
import { NumberStepper } from "../components/NumberStepper";
import { Page } from "../components/Page";
import { SummaryTile, SummaryTiles } from "../components/SummaryTile";
import { useToast } from "../components/Toast";

const FAKE_SAVE_MS = 700;
const SAVE_ERROR = "Nie udało się zapisać. Sprawdź połączenie i spróbuj ponownie.";
const DELETE_ERROR = "Nie udało się usunąć. Sprawdź połączenie i spróbuj ponownie.";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mt-6 mb-3 text-[13px] font-semibold">{title}</h2>
      {children}
    </div>
  );
}

/** Preview of the shared components. Not linked from the menu; open it at /#/_kit. */
export function Kit() {
  const toast = useToast();
  const [failNext, setFailNext] = useState(false);
  const [count, setCount] = useState(3);

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (setOpen: (value: boolean) => void) => {
    setError(null);
    setOpen(true);
  };

  // Stands in for a real request so the saving and error states can be seen.
  const fakeSave = (close: () => void, failure: string, success: string) => {
    setError(null);
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      if (failNext) {
        setError(failure);
        return;
      }
      close();
      toast(success);
    }, FAKE_SAVE_MS);
  };

  return (
    <Page title="Komponenty" subtitle="Podgląd elementów wspólnych.">
      <Section title="Kafle podsumowania">
        <SummaryTiles>
          <SummaryTile label="Amunicja" value={formatAmount("2480.00")} unit="zł" />
          <SummaryTile label="Wejścia" value={formatAmount("1120.00")} unit="zł" />
          <SummaryTile label="Za strzał" value={<MissingEndpoint />} />
        </SummaryTiles>
        <SummaryTiles>
          <SummaryTile label="Amunicja" value={formatAmount("2480.00")} unit="zł" />
          <SummaryTile label="Wejścia" value={formatAmount("1120.00")} unit="zł" />
          <SummaryTile label="Sprzęt" value={formatAmount("11234.5")} unit="zł" />
          <SummaryTile label="Za strzał" value={formatAmount("2.9")} unit="zł" accent />
        </SummaryTiles>
      </Section>

      <Section title="Znacznik „brak endpointu”">
        <div className="flex flex-wrap items-center gap-3">
          <MissingEndpoint />
          <MissingEndpoint endpoint="GET /weapons/{id}/history" />
        </div>
      </Section>

      <Section title="Kwoty">
        <p className="num m-0 text-sm">
          {formatMoney("1234.50")} · {formatMoney("0")} · {formatMoney("1234567.891")} · {formatMoney(null)}
        </p>
      </Section>

      <Section title="Przyciski">
        <div className="flex flex-wrap items-center gap-[9px]">
          <Button>Zapisz</Button>
          <Button variant="ghost">Anuluj</Button>
          <Button variant="danger">Usuń</Button>
          <Button busy>Zapisz</Button>
          <Button variant="danger" busy>
            Usuń
          </Button>
        </div>
      </Section>

      <Section title="Pole liczbowe">
        <div className="flex items-center gap-3">
          <NumberStepper label="Liczba magazynków" value={count} onChange={setCount} />
          <span className="num text-sm text-muted">wartość: {count}</span>
        </div>
      </Section>

      <Section title="Komunikat błędu">
        <div className="max-w-[400px]">
          <FormError message={SAVE_ERROR} />
        </div>
      </Section>

      <Section title="Okna i pasek potwierdzenia">
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-[13px]">
          <input type="checkbox" checked={failNext} onChange={(event) => setFailNext(event.target.checked)} />
          Zapis kończy się błędem
        </label>
        <div className="flex flex-wrap items-center gap-[9px]">
          <Button onClick={() => open(setModalOpen)}>Otwórz okno</Button>
          <Button variant="ghost" onClick={() => open(setConfirmOpen)}>
            Otwórz potwierdzenie usunięcia
          </Button>
          <Button variant="ghost" onClick={() => toast("Trening zapisany")}>
            Pokaż pasek
          </Button>
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        busy={busy}
        narrow
        title="Przykładowe okno"
        subtitle="Zamykanie: ✕, Anuluj, Escape, kliknięcie w tło"
      >
        <ModalBody>
          <div className="flex items-center gap-3">
            <NumberStepper label="Liczba magazynków" value={count} onChange={setCount} />
            <span className="text-[13px] text-muted">magazynków</span>
          </div>
          <ModalActions
            onCancel={() => setModalOpen(false)}
            onSubmit={() => fakeSave(() => setModalOpen(false), SAVE_ERROR, "Zmiany zapisane")}
            submitLabel="Zapisz zmiany"
            busy={busy}
            error={error}
          />
        </ModalBody>
      </Modal>

      <ConfirmDelete
        open={confirmOpen}
        title="Usunąć trening z 14 wrz?"
        description="Razem z nim znikną wszystkie jego wpisy o strzelaniu. Tej operacji nie da się cofnąć."
        busy={busy}
        error={error}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => fakeSave(() => setConfirmOpen(false), DELETE_ERROR, "Usunięto")}
      />
    </Page>
  );
}
