import { useParams } from "react-router-dom";
import { Page } from "../components/Page";

export function WeaponDetails() {
  const { id } = useParams();
  return <Page title="Szczegóły broni" subtitle={`Broń nr ${id} · widok w przygotowaniu.`} />;
}
