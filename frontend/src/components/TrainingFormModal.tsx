import { type FormEvent, useId, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { formatLongDate, todayIso } from "../api/format";
import { type Training, usePlaceSuggestions, useSaveTraining } from "../api/trainings";
import { Hint, INPUT, LABEL } from "./Field";
import { Modal, ModalActions, ModalBody } from "./Modal";
import { useToast } from "./Toast";

interface TrainingFormModalProps {
  open: boolean;
  /** The training being edited. Without it the window adds a new training. */
  training?: Training;
  onClose: () => void;
}

/** Window for adding a training or editing an existing one. */
export function TrainingFormModal({ open, training, onClose }: TrainingFormModalProps) {
  // Mounted only while open, so every opening starts from the clicked training's data.
  return open ? <TrainingForm training={training} onClose={onClose} /> : null;
}

// Up to 8 digits before the separator and 2 after: the range of the database column.
const COST = /^\d{1,8}([.,]\d{1,2})?$/;

function TrainingForm({ training, onClose }: { training?: Training; onClose: () => void }) {
  const editing = training !== undefined;
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const save = useSaveTraining(training?.id);
  const places = usePlaceSuggestions();
  const placesId = useId();

  const today = todayIso();
  const [date, setDate] = useState(training?.training_date ?? today);
  const [cost, setCost] = useState(training?.cost ?? "");
  const [place, setPlace] = useState(training?.place ?? "");
  const [note, setNote] = useState(training?.note ?? "");
  const [invalid, setInvalid] = useState<string | null>(null);

  /** Checks the rules the backend also enforces, so the message can be shown in Polish. */
  const validate = (): string | null => {
    if (!date) return "Podaj datę treningu.";
    if (date > today) return "Data treningu nie może być z przyszłości.";
    if (!cost.trim()) return "Podaj koszt wejścia — może być 0.";
    if (!COST.test(cost.trim())) return "Koszt wejścia musi być kwotą nie mniejszą niż 0, najwyżej z groszami.";
    return null;
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    const problem = validate();
    setInvalid(problem);
    if (problem) {
      save.reset();
      return;
    }
    save.mutate(
      {
        training_date: date,
        cost: cost.trim().replace(",", "."),
        place: place.trim() || null,
        note: note.trim() || null,
      },
      {
        onSuccess: () => {
          onClose();
          toast("Trening zapisany");
          if (!editing && location.pathname !== "/trainings") navigate("/trainings");
        },
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      busy={save.isPending}
      narrow
      title={editing ? "Edytuj trening" : "Nowy trening"}
      subtitle={editing ? formatLongDate(training.training_date) : "Broń dodasz po zapisaniu treningu"}
    >
      <ModalBody>
        <form onSubmit={submit} noValidate>
          <div className="mb-4 grid grid-cols-2 gap-3 max-[400px]:grid-cols-1">
            <div className="min-w-0">
              <label className={LABEL} htmlFor="training-date">
                Data
              </label>
              <input
                id="training-date"
                type="date"
                max={today}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className={`${INPUT} num`}
              />
            </div>
            <div className="min-w-0">
              <label className={LABEL} htmlFor="training-cost">
                Wejście<Hint>zł, może być 0</Hint>
              </label>
              <input
                id="training-cost"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={cost}
                onChange={(event) => setCost(event.target.value)}
                className={`${INPUT} num`}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className={LABEL} htmlFor="training-place">
              Miejsce<Hint>nieobowiązkowe</Hint>
            </label>
            <input
              id="training-place"
              type="text"
              list={placesId}
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              className={INPUT}
            />
            <datalist id={placesId}>
              {places.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </div>

          <div>
            <label className={LABEL} htmlFor="training-note">
              Notatka<Hint>nieobowiązkowa</Hint>
            </label>
            <textarea
              id="training-note"
              placeholder="Jak poszło, co ćwiczyłeś, co poprawić"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`${INPUT} min-h-[76px] resize-y leading-[1.5]`}
            />
          </div>

          {editing && (
            <p className="mt-3 mb-0 text-xs text-muted">Broń i porcje strzelania edytujesz w szczegółach treningu.</p>
          )}

          <ModalActions
            onCancel={onClose}
            submitLabel={editing ? "Zapisz zmiany" : "Zapisz trening"}
            submitType="submit"
            busy={save.isPending}
            error={invalid ?? save.error?.message}
          />
        </form>
      </ModalBody>
    </Modal>
  );
}
