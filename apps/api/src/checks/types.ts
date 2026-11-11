/** Result of a dependency probe. Probes never throw. */
export interface CheckResult {
  ok: boolean;
  detail: string;
}

export type Check = () => Promise<CheckResult>;
