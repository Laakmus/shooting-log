/**
 * Marks a value the backend cannot provide yet.
 * `endpoint` optionally names what is missing, e.g. "GET /weapons/{id}/history".
 */
export function MissingEndpoint({ endpoint }: { endpoint?: string }) {
  return (
    <span className="inline-block rounded-[5px] bg-line px-2 py-[2px] font-sans text-[11px] leading-[1.5] font-[560] tracking-normal text-muted">
      brak endpointu
      {endpoint && <span className="num font-normal"> · {endpoint}</span>}
    </span>
  );
}
