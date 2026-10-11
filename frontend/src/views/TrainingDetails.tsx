import { useParams } from "react-router-dom";
import { Page } from "../components/Page";

export function TrainingDetails() {
  const { id } = useParams();
  return <Page title="Szczegóły treningu" subtitle={`Trening nr ${id} · widok w przygotowaniu.`} />;
}
