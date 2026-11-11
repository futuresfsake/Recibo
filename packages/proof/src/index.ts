/**
 * The Resibo evidence contract.
 *
 * Rule (AGENTS.md #1): a claim shown to the user must carry a verified quote.
 * Here the rule is a type, not a convention. A `VerifiedQuote` carries a
 * brand that only the verifier (FR-07, built in M4) can mint, so any code
 * path that tries to show a raw LLM quote fails to compile.
 */

declare const verifiedBrand: unique symbol;

export type Rating = "strong" | "partial" | "gap";
export type Importance = "required" | "preferred";

/** A quote exactly as the LLM returned it. Never shown to the user. */
export interface RawQuote {
  readonly text: string;
}

/** A quote that passed the fuzzy match against the resume text. */
export interface VerifiedQuote {
  readonly text: string;
  /** Fuzzy-match score, 0-100, at or above the configured threshold. */
  readonly score: number;
  readonly [verifiedBrand]: true;
}

/** One requirement from the job post, judged against the resume. */
export interface Finding {
  readonly requirementId: string;
  readonly importance: Importance;
  readonly rating: Rating;
  readonly explanation: string;
  /** Only verified quotes can live here. */
  readonly evidence: readonly VerifiedQuote[];
  /** True when the LLM's claim lost all its quotes and was downgraded to `gap`. */
  readonly hallucinationCaught: boolean;
}

/** A red-flag signal from Post Check. Advisory, never a verdict (AGENTS.md #14). */
export interface Signal {
  readonly ruleId: string;
  readonly label: string;
  /** Exact quote from the job post that triggered the rule. */
  readonly quote: string;
}
