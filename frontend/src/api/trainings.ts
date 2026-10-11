import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Paged, request, requestPaged } from "./client";
import { toIso } from "./format";
import type { components } from "./schema";

export type Training = components["schemas"]["TrainingSessionDetail"];
export type TrainingCreate = components["schemas"]["TrainingSessionCreate"];
export type TrainingUpdate = components["schemas"]["TrainingSessionUpdate"];

export const TRAINING_SORTS = ["date_desc", "date_asc", "cost_desc", "cost_asc"] as const;
export type TrainingSort = (typeof TRAINING_SORTS)[number];

/** A page of the list never holds more trainings than this. */
export const PAGE_SIZE = 50;

// Every query under this key resolves to Paged<Training>, which lets usePlaceSuggestions read them all alike.
const ROOT = "trainings";

interface PageFilters {
  weaponId?: number;
  sort: TrainingSort;
  /** 1-based. */
  page: number;
  /** False while the list is not on screen (the calendar is). */
  enabled?: boolean;
}

/** One page of the list, filtered and sorted by the server. `total` counts every training matching the filter. */
export function useTrainingsPage({ weaponId, sort, page, enabled = true }: PageFilters) {
  return useQuery({
    enabled,
    queryKey: [ROOT, "page", { weaponId: weaponId ?? null, sort, page }],
    queryFn: () =>
      requestPaged<Training>("/training/", {
        query: { weapon_id: weaponId, sort, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
      }),
    // The previous page stays on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}

/** The number of all trainings and the date of the oldest one, in a single small request. */
export function useTrainingsOverview() {
  return useQuery({
    queryKey: [ROOT, "overview"],
    queryFn: () => requestPaged<Training>("/training/", { query: { sort: "date_asc", limit: 1 } }),
    select: (data: Paged<Training>) => ({ count: data.total, firstDate: data.items[0]?.training_date }),
  });
}

/** Trainings of one calendar month ("2026-09"), oldest first. */
export function useTrainingsMonth(month: string, weaponId?: number) {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number);
  return useQuery({
    queryKey: [ROOT, "month", { month, weaponId: weaponId ?? null }],
    queryFn: () =>
      requestPaged<Training>("/training/", {
        query: {
          weapon_id: weaponId,
          date_from: `${month}-01`,
          // Day 0 of the next month is the last day of this one.
          date_to: toIso(new Date(year, monthNumber, 0)),
          sort: "date_asc",
        },
      }),
    placeholderData: keepPreviousData,
  });
}

/** Places of the trainings already loaded by any view, alphabetically. Sends no request of its own. */
export function usePlaceSuggestions(): string[] {
  const queryClient = useQueryClient();
  const places = new Set<string>();
  for (const [, data] of queryClient.getQueriesData<Paged<Training>>({ queryKey: [ROOT] })) {
    for (const training of data?.items ?? []) {
      const place = training.place?.trim();
      if (place) places.add(place);
    }
  }
  return [...places].sort((a, b) => a.localeCompare(b, "pl"));
}

/** A change to a training also changes weapon totals and the statistics, so every cached query is refreshed. */
function useRefreshAll() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries();
}

/** Creates a training, or updates the one with `id` when it is given. */
export function useSaveTraining(id?: number) {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (body: TrainingCreate | TrainingUpdate) =>
      id === undefined
        ? request("/training/", { method: "POST", body })
        : request("/training/{training_id}", { method: "PATCH", params: { training_id: id }, body }),
    onSuccess: () => void refresh(),
  });
}

/** Deletes a training together with its shooting entries. */
export function useDeleteTraining() {
  const refresh = useRefreshAll();
  return useMutation({
    mutationFn: (id: number) => request("/training/{training_id}", { method: "DELETE", params: { training_id: id } }),
    // Waits for the lists to reload, so the confirmation closes onto a list without the deleted row.
    onSuccess: () => refresh(),
  });
}
