import type { Config } from "../config.js";
import type { Check } from "./types.js";

type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{
  ok: boolean;
  json(): Promise<unknown>;
}>;

/** Probe Ollama and report a missing model. Never throws. */
export function createOllamaCheck(config: Config, fetchImpl: FetchLike = fetch): Check {
  return async () => {
    let names: string[];
    try {
      const res = await fetchImpl(`${config.ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return { ok: false, detail: "ollama unreachable: bad status" };
      const body = (await res.json()) as { models?: { name?: string }[] };
      names = (body.models ?? []).map((m) => m.name ?? "");
    } catch (err) {
      const kind = err instanceof Error ? err.name : "Error";
      return { ok: false, detail: `ollama unreachable: ${kind}` };
    }
    const wanted = [config.llm.model, config.llm.embedModel];
    const missing = wanted.filter(
      (m) => !names.some((n) => n === m || n.startsWith(`${m}:`)),
    );
    if (missing.length > 0) {
      return {
        ok: false,
        detail: `model not pulled: ${missing.join(", ")} (run: ollama pull <model>)`,
      };
    }
    return { ok: true, detail: "ok" };
  };
}
