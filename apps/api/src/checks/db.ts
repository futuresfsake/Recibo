import pg from "pg";
import type { Config } from "../config.js";
import type { Check } from "./types.js";

/**
 * Postgres is dev/eval only (docs/ARCHITECTURE.md). With no password set the
 * database counts as "not configured", which is healthy, not degraded.
 */
export function createDbCheck(config: Config): Check {
  return async () => {
    const { user, password, database, host, port } = config.postgres;
    if (!password) return { ok: true, detail: "not configured (optional, dev/eval only)" };
    const client = new pg.Client({
      user,
      password,
      database,
      host,
      port,
      connectionTimeoutMillis: 3000,
    });
    try {
      await client.connect();
      await client.query("SELECT 1");
      return { ok: true, detail: "ok" };
    } catch (err) {
      const kind = err instanceof Error ? err.name : "Error";
      return { ok: false, detail: `database unreachable: ${kind}` };
    } finally {
      await client.end().catch(() => undefined);
    }
  };
}
