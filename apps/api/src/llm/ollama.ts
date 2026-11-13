import { asRecord, isVectorList, numberOrNull, parseModelJson, postJson, type FetchFn } from "./http.js";
import {
  DEFAULT_TIMEOUT_MS,
  LLMError,
  type EmbedResponse,
  type LLMClient,
  type StructuredRequest,
  type StructuredResponse,
} from "./types.js";

export interface OllamaOptions {
  baseUrl: string;
  model: string;
  embedModel: string;
  fetchImpl?: FetchFn;
}

/** Local Ollama. Free, no key; for development and the owner's laptop. */
export function createOllamaClient(opts: OllamaOptions): LLMClient {
  const provider = "ollama";
  const doFetch = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/+$/, "");
  // Ollama answers 404 when the model is not pulled.
  const onStatus = (status: number) => (status === 404 ? ("model_missing" as const) : undefined);

  return {
    provider,
    model: opts.model,

    async generateStructured(req: StructuredRequest): Promise<StructuredResponse> {
      const started = Date.now();
      const { body } = await postJson(
        provider,
        doFetch,
        `${base}/api/chat`,
        {
          model: opts.model,
          stream: false,
          format: req.jsonSchema,
          options: { temperature: 0 }, // NFR-02
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.prompt },
          ],
        },
        {},
        req.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        onStatus,
      );
      const reply = asRecord(body);
      return {
        data: parseModelJson(provider, asRecord(reply.message).content),
        meta: {
          provider,
          model: opts.model,
          latencyMs: Date.now() - started,
          promptTokens: numberOrNull(reply.prompt_eval_count),
          completionTokens: numberOrNull(reply.eval_count),
        },
      };
    },

    async embed(texts: string[], timeoutMs = DEFAULT_TIMEOUT_MS): Promise<EmbedResponse> {
      const started = Date.now();
      const { body } = await postJson(
        provider,
        doFetch,
        `${base}/api/embed`,
        { model: opts.embedModel, input: texts },
        {},
        timeoutMs,
        onStatus,
      );
      const reply = asRecord(body);
      if (!isVectorList(reply.embeddings) || reply.embeddings.length !== texts.length) {
        throw new LLMError("bad_output", provider, "ollama: unexpected embedding reply");
      }
      return {
        vectors: reply.embeddings,
        meta: {
          provider,
          model: opts.embedModel,
          latencyMs: Date.now() - started,
          promptTokens: numberOrNull(reply.prompt_eval_count),
          completionTokens: null,
        },
      };
    },
  };
}
