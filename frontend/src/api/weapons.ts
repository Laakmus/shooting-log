import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, request } from "./client";
import type { components } from "./schema";

export type Weapon = components["schemas"]["WeaponRead"];
export type WeaponDetail = components["schemas"]["WeaponDetail"];
export type WeaponCreate = components["schemas"]["WeaponCreate"];
export type WeaponUpdate = components["schemas"]["WeaponUpdate"];

const listKey = ["weapons", "list"] as const;
const detailKey = (id: number) => ["weapons", "detail", id] as const;

const fetchDetail = (id: number) => request<WeaponDetail>("/weapons/{weapon_id}", { params: { weapon_id: id } });

/** A missing weapon will not appear on a second try. */
const retryUnlessNotFound = (failureCount: number, error: Error) =>
  !(error instanceof ApiError && error.status === 404) && failureCount < 1;

/**
 * Every weapon (retired ones included) with its total rounds.
 * One request for the list plus one per weapon, because only the detail endpoint returns `total_rounds`.
 */
export function useWeaponsWithTotals() {
  const list = useQuery({
    queryKey: listKey,
    queryFn: () => request<Weapon[]>("/weapons/", { query: { include_inactive: true } }),
  });
  const details = useQueries({
    queries: (list.data ?? []).map((weapon) => ({
      queryKey: detailKey(weapon.id),
      queryFn: () => fetchDetail(weapon.id),
    })),
  });

  const error = list.error ?? details.find((detail) => detail.error)?.error ?? null;
  const isPending = list.isPending || details.some((detail) => detail.isPending);
  const weapons = isPending || error ? undefined : details.map((detail) => detail.data as WeaponDetail);

  const refetch = () => {
    void list.refetch();
    for (const detail of details) if (detail.error) void detail.refetch();
  };

  return { weapons, isPending, error, refetch };
}

export function useWeapon(id: number) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => fetchDetail(id),
    enabled: Number.isInteger(id),
    retry: retryUnlessNotFound,
  });
}

/** After any change to a weapon every cached query is refreshed (weapon costs also feed the statistics). */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => void queryClient.invalidateQueries();
}

/** Creates a weapon, or updates the one with `id` when it is given. */
export function useSaveWeapon(id?: number) {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (body: WeaponCreate | WeaponUpdate) =>
      id === undefined
        ? request<Weapon>("/weapons/", { method: "POST", body })
        : request<Weapon>("/weapons/{weapon_id}", { method: "PATCH", params: { weapon_id: id }, body }),
    onSuccess: refresh,
  });
}

/** Soft delete: the weapon becomes inactive, its shooting history stays. */
export function useRetireWeapon() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (id: number) => request("/weapons/{weapon_id}", { method: "DELETE", params: { weapon_id: id } }),
    onSuccess: refresh,
  });
}
