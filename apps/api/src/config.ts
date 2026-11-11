import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(8000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  POSTGRES_USER: z.string().default("resibo"),
  POSTGRES_PASSWORD: z.string().default(""), // optional; empty means "DB not configured"
  POSTGRES_DB: z.string().default("resibo"),
  POSTGRES_HOST: z.string().default("localhost"),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  LLM_PROVIDER: z.enum(["ollama", "openai_compat"]).default("ollama"),
  OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
  LLM_MODEL: z.string().default("qwen2.5:7b"),
  EMBED_MODEL: z.string().default("nomic-embed-text"),
  OPENAI_COMPAT_BASE_URL: z.string().default(""),
  OPENAI_COMPAT_API_KEY: z.string().default(""),
  CITATION_MATCH_THRESHOLD: z.coerce.number().min(0).max(100).default(90),
});

export interface Config {
  port: number;
  corsOrigin: string;
  /** Connection parts, never a full URL string, so no credential string lives in code or docs. */
  postgres: { user: string; password: string; database: string; host: string; port: number };
  llm: { provider: "ollama" | "openai_compat"; model: string; embedModel: string };
  ollamaBaseUrl: string;
  openaiCompat: { baseUrl: string; apiKey: string };
  citationMatchThreshold: number;
}

/** Parse and validate settings from the environment. No credential defaults. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const e = schema.parse(env);
  return {
    port: e.PORT,
    corsOrigin: e.CORS_ORIGIN,
    postgres: {
      user: e.POSTGRES_USER,
      password: e.POSTGRES_PASSWORD,
      database: e.POSTGRES_DB,
      host: e.POSTGRES_HOST,
      port: e.POSTGRES_PORT,
    },
    llm: { provider: e.LLM_PROVIDER, model: e.LLM_MODEL, embedModel: e.EMBED_MODEL },
    ollamaBaseUrl: e.OLLAMA_BASE_URL,
    openaiCompat: { baseUrl: e.OPENAI_COMPAT_BASE_URL, apiKey: e.OPENAI_COMPAT_API_KEY },
    citationMatchThreshold: e.CITATION_MATCH_THRESHOLD,
  };
}
