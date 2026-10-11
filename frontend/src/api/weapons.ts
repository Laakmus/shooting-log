import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, request } from "./client";
import { toNumber } from "./money";
import type { components } from "./schema";

export type Weapon = components["schemas"]["WeaponRead"];
export type WeaponDetail = components["schemas"]["WeaponDetail"];
export type WeaponCreate = components["schemas"]["WeaponCreate"];
export type WeaponUpdate = components["schemas"]["WeaponUpdate"];
export type WeaponHistoryItem = components["schemas"]["WeaponHistoryItem"];

const listKey = ["weapons", "list"] as const;
const detailKey = (id: number) => ["weapons", "detail", id] as const;
const historyKey = (id: number) => ["weapons", "history", id] as const;

const fetchDetail = (id: number) => request<WeaponDetail>("/weapons/{weapon_id}", { params: { weapon_id: id } });

/** A missing weapon will not appear on a second try. */
const retryUnlessNotFound = (failureCount: number, error: Error) =>
  !(error instanceof ApiError && error.status === 404) && failureCount < 1;

/** Every weapon (retired ones included) with its totals, in a single request. */
export function useWeapons() {
  return useQuery({
    queryKey: listKey,
    queryFn: () => request<WeaponDetail[]>("/weapons/", { query: { include_inactive: true } }),
  });
}

export function useWeapon(id: number) {
  return useQuery({
    queryKey: detailKey(id),
    queryFn: () => fetchDetail(id),
    enabled: Number.isInteger(id),
    retry: retryUnlessNotFound,
  });
}

/** Trainings in which the weapon was used, newest first. */
export function useWeaponHistory(id: number) {
  return useQuery({
    queryKey: historyKey(id),
    queryFn: () => request<WeaponHistoryItem[]>("/weapons/{weapon_id}/history", { params: { weapon_id: id } }),
    enabled: Number.isInteger(id),
    retry: retryUnlessNotFound,
  });
}

/**
 * Average cost of one round: ammunition, plus the purchase price for an owned weapon.
 * Null when the weapon has not been fired yet.
 */
export function costPerRound(weapon: WeaponDetail): number | null {
  if (weapon.total_rounds <= 0) return null;
  const ammo = toNumber(weapon.ammo_cost) ?? 0;
  const purchase = weapon.is_owned ? (toNumber(weapon.purchase_price) ?? 0) : 0;
  return (ammo + purchase) / weapon.total_rounds;
}

/**
 * After any change to a weapon every cached query — the list, the details and the shooting history — is refreshed
 * (weapon costs also feed the statistics).
 */
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
