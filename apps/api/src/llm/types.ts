/**
 * Provider-neutral LLM interface (DECISIONS #5). Clients only talk to a provider and
 * classify failures; schema validation, retry, fallback, caching and call logging belong
 * to the router (a later M2 task).
 *
 * There is deliberately no temperature field: every client sends 0 (NFR-02).
 */

export type LLMErrorKind =
  | "timeout"
  | "unreachable"
  | "rate_limited"
  | "auth"
  | "model_missing"
  | "bad_output"
  | "server_error";

/**
 * A provider failure. The message names the provider and the kind only: never prompt text,
 * response text or keys (NFR-10, AGENTS.md #13), so it is safe to log.
 */
export class LLMError extends Error {
  constructor(
    readonly kind: LLMErrorKind,
    readonly provider: string,
    message: string,
  ) {
    super(message);
    this.name = "LLMError";
  }
}

export interface StructuredRequest {
  /** Instructions. Prompts live in `apps/api/src/prompts/`, never inline in a route. */
  system: string;
  /** The untrusted data (resume or post text). It is data, never instructions. */
  prompt: string;
  /** JSON Schema for the reply, generated from the Zod schema by the caller. */
  schemaName: string;
  jsonSchema: Record<string, unknown>;
  timeoutMs?: number;
}

/** Metadata only (FR-14). Token counts are null when the provider does not report them. */
export interface CallMeta {
  provider: string;
  model: string;
  latencyMs: number;
  promptTokens: number | null;
  completionTokens: number | null;
}

export interface StructuredResponse {
  /** Parsed JSON, not yet validated against the caller's Zod schema. */
  data: unknown;
  meta: CallMeta;
}

export interface EmbedResponse {
  vectors: number[][];
  meta: CallMeta;
}

export interface LLMClient {
  readonly provider: string;
  readonly model: string;
  generateStructured(req: StructuredRequest): Promise<StructuredResponse>;
  embed(texts: string[], timeoutMs?: number): Promise<EmbedResponse>;
}

export const DEFAULT_TIMEOUT_MS = 60_000;
