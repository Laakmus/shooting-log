import type { paths } from "./schema";

/** Every path the backend exposes. Collection paths carry their trailing slash ("/weapons/"). */
export type ApiPath = keyof paths;

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** Values for the "{placeholders}" in the path. */
  params?: Record<string, string | number>;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
}

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const CONNECTION_ERROR = "Brak połączenia z serwerem. Sprawdź połączenie i spróbuj ponownie.";

function buildUrl(path: string, { params = {}, query = {} }: RequestOptions): string {
  const filled = path.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = params[name];
    if (value === undefined) throw new Error(`Missing path parameter "${name}" for ${path}`);
    return encodeURIComponent(String(value));
  });
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const queryString = search.toString();
  return queryString ? `${filled}?${queryString}` : filled;
}

/**
 * Turns a FastAPI error body into one readable message.
 * `detail` is a string for HTTPException and a list of items for Pydantic validation errors.
 */
export function errorMessage(body: unknown, status: number): string {
  const detail = typeof body === "object" && body !== null ? (body as { detail?: unknown }).detail : undefined;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        const msg = typeof item === "object" && item !== null ? (item as { msg?: unknown }).msg : undefined;
        return typeof msg === "string" ? msg.replace(/^Value error, /, "") : "";
      })
      .filter(Boolean);
    if (messages.length > 0) return messages.join(" ");
  }
  return `Serwer odpowiedział błędem (${status}). Spróbuj ponownie.`;
}

/** Sends one request and returns the parsed body with the response headers. The body is `undefined` for 204. */
async function send(path: ApiPath, options: RequestOptions): Promise<{ body: unknown; headers: Headers }> {
  const hasBody = options.body !== undefined;
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options), {
      method: options.method ?? "GET",
      headers: hasBody ? { "Content-Type": "application/json" } : undefined,
      body: hasBody ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(CONNECTION_ERROR, 0);
  }

  if (response.status === 204) return { body: undefined, headers: response.headers };

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(errorMessage(body, response.status), response.status);
  return { body, headers: response.headers };
}

/** The single entry point for talking to the backend. Resolves to `undefined` for 204 responses. */
export async function request<T = void>(path: ApiPath, options: RequestOptions = {}): Promise<T> {
  return (await send(path, options)).body as T;
}

/** One page of a list together with the number of all matching rows. */
export interface Paged<T> {
  items: T[];
  total: number;
}

/**
 * Like `request`, for list endpoints that report the number of all matching rows
 * in the `X-Total-Count` response header.
 */
export async function requestPaged<T>(path: ApiPath, options: RequestOptions = {}): Promise<Paged<T>> {
  const { body, headers } = await send(path, options);
  const items = Array.isArray(body) ? (body as T[]) : [];
  const total = Number.parseInt(headers.get("X-Total-Count") ?? "", 10);
  return { items, total: Number.isNaN(total) ? items.length : total };
}
