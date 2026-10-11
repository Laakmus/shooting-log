import { useQuery } from "@tanstack/react-query";
import { request } from "./client";
import type { components } from "./schema";

export type Stats = components["schemas"]["StatsRead"];

export function useStats() {
  return useQuery({ queryKey: ["stats"], queryFn: () => request<Stats>("/stats/") });
}

/**
 * Rounds fired in all trainings, or `undefined` when the backend does not report them:
 * the field is read from the response itself, so it starts working once the endpoint returns it.
 */
export function totalRounds(stats: Stats): number | undefined {
  const value = (stats.total as Record<string, unknown>).total_rounds;
  const rounds = typeof value === "string" ? Number(value) : value;
  return typeof rounds === "number" && Number.isFinite(rounds) ? rounds : undefined;
}
