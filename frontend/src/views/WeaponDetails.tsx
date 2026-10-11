import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../api/client";
import { formatCount, plural } from "../api/format";
import { useWeapon } from "../api/weapons";
import { IconButton } from "../components/IconButton";
import { LoadError } from "../components/LoadError";
import { MissingEndpoint } from "../components/MissingEndpoint";
import { Page } from "../components/Page";
import { RetireWeaponDialog } from "../components/RetireWeaponDialog";
import { SummaryTile, SummaryTiles } from "../components/SummaryTile";
import { Tag } from "../components/Tag";
import { WeaponFormModal } from "../components/WeaponFormModal";

function BackLink() {
  return (
    <Link to="/weapons" className="mb-[14px] inline-flex items-center gap-[6px] text-sm text-muted no-underline hover:text-accent">
      ← Moja broń
    </Link>
  );
}

export function WeaponDetails() {
  const { id } = useParams();
  const weaponId = /^\d+$/.test(id ?? "") ? Number(id) : Number.NaN;
  const { data: weapon, error, isPending, refetch } = useWeapon(weaponId);

  const [editing, setEditing] = useState(false);
  const [retiring, setRetiring] = useState(false);

  const notFound = Number.isNaN(weaponId) || (error instanceof ApiError && error.status === 404);
  if (notFound) {
    return (
      <Page>
        <BackLink />
        <h1 className="m-0 mb-[6px] text-2xl font-[640] tracking-[-0.02em]">Nie ma takiej broni</h1>
        <p className="m-0 text-sm text-muted">Broń o tym numerze nie istnieje. Wróć do listy i wybierz inną.</p>
      </Page>
    );
  }
  if (error) {
    return (
      <Page>
        <BackLink />
        <LoadError message={error.message} onRetry={() => void refetch()} />
      </Page>
    );
  }
  if (isPending) {
    return (
      <Page>
        <BackLink />
        <p className="m-0 text-sm text-muted">Wczytywanie…</p>
      </Page>
    );
  }

  return (
    <Page>
      <BackLink />
      <div className="mb-[6px] flex items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1">
            <h1 className="m-0 text-2xl font-[640] tracking-[-0.02em] [overflow-wrap:anywhere]">{weapon.name}</h1>
            {!weapon.is_owned && <Tag>klubowa</Tag>}
            {!weapon.is_active && <Tag muted>wycofana</Tag>}
          </div>
          <p className="m-0 mb-5 text-sm text-muted">
            magazynek na <span className="num">{weapon.magazine_capacity}</span>{" "}
            {plural(weapon.magazine_capacity, ["pocisk", "pociski", "pocisków"])} ·{" "}
            {weapon.is_owned ? "własna" : "broń strzelnicy"}
          </p>
        </div>
        <div className="flex gap-[7px]">
          <IconButton large label={`Edytuj ${weapon.name}`} onClick={() => setEditing(true)}>
            ✎
          </IconButton>
          {weapon.is_active && (
            <IconButton large label={`Wycofaj ${weapon.name}`} onClick={() => setRetiring(true)}>
              ✕
            </IconButton>
          )}
        </div>
      </div>

      <SummaryTiles>
        <SummaryTile
          label="Wystrzelone"
          value={formatCount(weapon.total_rounds)}
          unit={plural(weapon.total_rounds, ["pocisk", "pociski", "pocisków"])}
        />
        <SummaryTile label="Treningi" value={<MissingEndpoint />} />
        <SummaryTile label="Amunicja" value={<MissingEndpoint />} />
        <SummaryTile label="Za strzał" value={<MissingEndpoint />} />
      </SummaryTiles>

      <h2 className="mt-6 mb-3 text-[13px] font-semibold">Historia strzelania</h2>
      <div className="border-t border-line pt-3">
        <MissingEndpoint endpoint="GET /weapons/{id}/history" />
      </div>

      <WeaponFormModal open={editing} weapon={weapon} onClose={() => setEditing(false)} />
      <RetireWeaponDialog weapon={retiring ? weapon : null} onClose={() => setRetiring(false)} />
    </Page>
  );
}
