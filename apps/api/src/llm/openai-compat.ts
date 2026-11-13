import { asRecord, isVectorList, numberOrNull, parseModelJson, postJson, type FetchFn } from "./http.js";
import {
  DEFAULT_TIMEOUT_MS,
  LLMError,
  type EmbedResponse,
  type LLMClient,
  type StructuredRequest,
  type StructuredResponse,
} from "./types.js";

export interface OpenAICompatOptions {
  /** Provider root including any version path, e.g. the part before `/chat/completions`. */
  baseUrl: string;
  /** Read from the environment by the caller. Never logged, never put in error text. */
  apiKey: string;
  model: string;
  embedModel?: string;
  /** Short label used in logs and errors, e.g. a provider name. Defaults to "openai_compat". */
  name?: string;
  fetchImpl?: FetchFn;
}

/**
 * Any free hosted provider that speaks the OpenAI chat-completions format (DECISIONS #5).
 * Which providers join the chain, and their limits, is Q-07; this client is provider-neutral.
 */
export function createOpenAICompatClient(opts: OpenAICompatOptions): LLMClient {
  const provider = opts.name ?? "openai_compat";
  const doFetch = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/+$/, "");
  const headers = { Authorization: `Bearer ${opts.apiKey}` };

  return {
    provider,
    model: opts.model,

    async generateStructured(req: StructuredRequest): Promise<StructuredResponse> {
      const started = Date.now();
      const { body } = await postJson(
        provider,
        doFetch,
        `${base}/chat/completions`,
        {
          model: opts.model,
          temperature: 0, // NFR-02
          response_format: {
            type: "json_schema",
            json_schema: { name: req.schemaName, schema: req.jsonSchema, strict: true },
          },
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.prompt },
          ],
        },
        headers,
        req.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      );
      const reply = asRecord(body);
      const first = asRecord(Array.isArray(reply.choices) ? reply.choices[0] : undefined);
      const usage = asRecord(reply.usage);
      return {
        data: parseModelJson(provider, asRecord(first.message).content),
        meta: {
          provider,
          model: opts.model,
          latencyMs: Date.now() - started,
          promptTokens: numberOrNull(usage.prompt_tokens),
          completionTokens: numberOrNull(usage.completion_tokens),
        },
      };
    },

    async embed(texts: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<EmbedResponse> {
      if (opts.embedModel === undefined || opts.embedModel === "") {
        throw new LLMError("model_missing", provider, `${provider}: no embedding model configured`);
      }
      const started = Date.now();
      const { body } = await postJson(
        provider,
        doFetch,
        `${base}/embeddings`,
        { model: opts.embedModel, input: texts },
        headers,
        timeoutMs,
      );
      const reply = asRecord(body);
      const rows = Array.isArray(reply.data) ? reply.data.map((d) => asRecord(d).embedding) : [];
      if (!isVectorList(rows) || rows.length !== texts.length) {
        throw new LLMError("bad_output", provider, `${provider}: unexpected embedding reply`);
      }
      return {
        vectors: rows,
        meta: {
          provider,
          model: opts.embedModel,
          latencyMs: Date.now() - started,
          promptTokens: numberOrNull(asRecord(reply.usage).prompt_tokens),
          completionTokens: null,
        },
      };
    },
  };
}
