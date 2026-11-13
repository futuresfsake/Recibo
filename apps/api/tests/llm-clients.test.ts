import { describe, expect, it } from "vitest";
import { createOllamaClient } from "../src/llm/ollama.js";
import { createOpenAICompatClient } from "../src/llm/openai-compat.js";
import { LLMError, type StructuredRequest } from "../src/llm/types.js";

interface Call {
  url: string;
  headers: Record<string, string>;
  body: Record<string, unknown>;
}

/** A fake fetch that records requests and replies with a fixed status and JSON body. */
function fakeFetch(status: number, reply: unknown, calls: Call[] = []) {
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({
      url,
      headers: init.headers as Record<string, string>,
      body: JSON.parse(init.body as string) as Record<string, unknown>,
    });
    return new Response(typeof reply === "string" ? reply : JSON.stringify(reply), { status });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

const throwingFetch = (name: string) =>
  (async () => {
    const e = new Error("boom");
    e.name = name;
    throw e;
  }) as unknown as typeof fetch;

const req: StructuredRequest = {
  system: "Extract skills.",
  prompt: "SYNTHETIC RESUME TEXT",
  schemaName: "skills",
  jsonSchema: { type: "object", properties: { skills: { type: "array" } } },
};

const ollama = (fetchImpl: typeof fetch) =>
  createOllamaClient({ baseUrl: "http://localhost:11434/", model: "m1", embedModel: "e1", fetchImpl });
const hosted = (fetchImpl: typeof fetch, extra = {}) =>
  createOpenAICompatClient({ baseUrl: "https://llm.example/v1/", apiKey: "test-key-123", model: "m2", fetchImpl, ...extra });

async function kindOf(p: Promise<unknown>): Promise<{ kind: string; message: string }> {
  try {
    await p;
  } catch (err) {
    if (err instanceof LLMError) return { kind: err.kind, message: err.message };
    throw err;
  }
  throw new Error("expected an LLMError");
}

describe("ollama client", () => {
  it("NFR-02 sends temperature 0 and the JSON schema", async () => {
    const f = fakeFetch(200, { message: { content: '{"skills":["sql"]}' }, prompt_eval_count: 12, eval_count: 5 });
    const res = await ollama(f.impl).generateStructured(req);
    const sent = f.calls[0]!;
    expect(sent.url).toBe("http://localhost:11434/api/chat");
    expect((sent.body.options as { temperature: number }).temperature).toBe(0);
    expect(sent.body.format).toEqual(req.jsonSchema);
    expect(sent.body.stream).toBe(false);
    expect(res.data).toEqual({ skills: ["sql"] });
  });

  it("NFR-04 reports token counts and latency as metadata", async () => {
    const f = fakeFetch(200, { message: { content: "{}" }, prompt_eval_count: 12, eval_count: 5 });
    const { meta } = await ollama(f.impl).generateStructured(req);
    expect(meta).toMatchObject({ provider: "ollama", model: "m1", promptTokens: 12, completionTokens: 5 });
    expect(meta.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("NFR-04 an unpulled model is model_missing with the fix path left to the router", async () => {
    const f = fakeFetch(404, { error: "model not found" });
    expect((await kindOf(ollama(f.impl).generateStructured(req))).kind).toBe("model_missing");
  });

  it("NFR-04 a network failure is unreachable, a timeout is timeout", async () => {
    expect((await kindOf(ollama(throwingFetch("TypeError")).generateStructured(req))).kind).toBe("unreachable");
    expect((await kindOf(ollama(throwingFetch("TimeoutError")).generateStructured(req))).kind).toBe("timeout");
  });

  it("NFR-04 non-JSON model text is bad_output", async () => {
    const f = fakeFetch(200, { message: { content: "Sure! Here you go" } });
    expect((await kindOf(ollama(f.impl).generateStructured(req))).kind).toBe("bad_output");
  });

  it("NFR-04 embeddings come back one vector per input, and a short reply is rejected", async () => {
    const ok = fakeFetch(200, { embeddings: [[0.1, 0.2], [0.3, 0.4]] });
    const res = await ollama(ok.impl).embed(["a", "b"]);
    expect(res.vectors).toHaveLength(2);
    expect(ok.calls[0]!.body.model).toBe("e1");
    const short = fakeFetch(200, { embeddings: [[0.1]] });
    expect((await kindOf(ollama(short.impl).embed(["a", "b"]))).kind).toBe("bad_output");
  });
});

describe("openai-compatible client", () => {
  it("NFR-02 sends temperature 0, the schema and a bearer key", async () => {
    const f = fakeFetch(200, {
      choices: [{ message: { content: '{"skills":[]}' } }],
      usage: { prompt_tokens: 20, completion_tokens: 7 },
    });
    const res = await hosted(f.impl).generateStructured(req);
    const sent = f.calls[0]!;
    expect(sent.url).toBe("https://llm.example/v1/chat/completions");
    expect(sent.body.temperature).toBe(0);
    expect(sent.headers.Authorization).toBe("Bearer test-key-123");
    expect((sent.body.response_format as { json_schema: { schema: unknown } }).json_schema.schema).toEqual(req.jsonSchema);
    expect(res.meta).toMatchObject({ provider: "openai_compat", model: "m2", promptTokens: 20, completionTokens: 7 });
  });

  it("NFR-04 quota, auth and server failures are told apart so the router can fall back", async () => {
    expect((await kindOf(hosted(fakeFetch(429, {}).impl).generateStructured(req))).kind).toBe("rate_limited");
    expect((await kindOf(hosted(fakeFetch(402, {}).impl).generateStructured(req))).kind).toBe("rate_limited");
    expect((await kindOf(hosted(fakeFetch(401, {}).impl).generateStructured(req))).kind).toBe("auth");
    expect((await kindOf(hosted(fakeFetch(503, {}).impl).generateStructured(req))).kind).toBe("server_error");
  });

  it("NFR-04 a reply with no choices is bad_output", async () => {
    expect((await kindOf(hosted(fakeFetch(200, { choices: [] }).impl).generateStructured(req))).kind).toBe("bad_output");
  });

  it("NFR-04 embeddings need a configured embedding model", async () => {
    const f = fakeFetch(200, {});
    expect((await kindOf(hosted(f.impl).embed(["a"]))).kind).toBe("model_missing");
    const ok = fakeFetch(200, { data: [{ embedding: [1, 2] }] });
    const res = await hosted(ok.impl, { embedModel: "e2" }).embed(["a"]);
    expect(res.vectors).toEqual([[1, 2]]);
  });
});

describe("error text", () => {
  it("NFR-10 errors never contain prompt text, reply text or the API key", async () => {
    const cases = [
      hosted(fakeFetch(500, { error: "SYNTHETIC RESUME TEXT echoed" }).impl),
      hosted(fakeFetch(200, { choices: [{ message: { content: "not json SYNTHETIC RESUME TEXT" } }] }).impl),
      hosted(throwingFetch("TypeError")),
      ollama(fakeFetch(200, { message: { content: "bad SYNTHETIC RESUME TEXT" } }).impl),
    ];
    for (const client of cases) {
      const { message } = await kindOf(client.generateStructured(req));
      expect(message).not.toContain("SYNTHETIC RESUME TEXT");
      expect(message).not.toContain("test-key-123");
    }
  });

  it("NFR-01 the clients need no paid key: ollama sends no Authorization header", async () => {
    const f = fakeFetch(200, { message: { content: "{}" } });
    await ollama(f.impl).generateStructured(req);
    expect(f.calls[0]!.headers.Authorization).toBeUndefined();
  });
});
