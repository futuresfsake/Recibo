import { LLMError, type LLMErrorKind } from "./types.js";

export type FetchFn = typeof fetch;

export interface PostResult {
  status: number;
  body: unknown;
}

/** Map an HTTP status to a failure kind the router can act on. */
export function classifyStatus(status: number): LLMErrorKind {
  if (status === 401 || status === 403) return "auth";
  // 402 is how some free tiers report an exhausted quota.
  if (status === 429 || status === 402) return "rate_limited";
  return "server_error";
}

/**
 * POST JSON with a timeout. Throws LLMError for timeouts, network failures and non-2xx
 * statuses; `onStatus` lets a client override the kind for a specific status.
 * Error messages never include the request or response body.
 */
export async function postJson(
  provider: string,
  fetchImpl: FetchFn,
  url: string,
  payload: unknown,
  headers: Record<string, string>,
  timeoutMs: number,
  onStatus?: (status: number) => LLMErrorKind | undefined,
): Promise<PostResult> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new LLMError("timeout", provider, `${provider}: timed out after ${timeoutMs} ms`);
    }
    throw new LLMError("unreachable", provider, `${provider}: unreachable (${name})`);
  }
  if (!res.ok) {
    const kind = onStatus?.(res.status) ?? classifyStatus(res.status);
    throw new LLMError(kind, provider, `${provider}: ${kind} (HTTP ${res.status})`);
  }
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new LLMError("bad_output", provider, `${provider}: reply was not JSON`);
  }
  return { status: res.status, body };
}

/** Parse the model's text as JSON. Throws bad_output without echoing the text. */
export function parseModelJson(provider: string, text: unknown): unknown {
  if (typeof text !== "string" || text.trim() === "") {
    throw new LLMError("bad_output", provider, `${provider}: empty reply`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new LLMError("bad_output", provider, `${provider}: reply was not valid JSON`);
  }
}

export function numberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Narrow an unknown value to a plain object for safe property reads. */
export function asRecord(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

export function isVectorList(v: unknown): v is number[][] {
  return Array.isArray(v) && v.every((row) => Array.isArray(row) && row.every((n) => typeof n === "number"));
}
