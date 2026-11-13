import type { Signal } from "./index.js";

/**
 * Post Check rule engine (FR-17, FR-18). Pure, deterministic, no LLM, no I/O.
 *
 * Every signal carries an exact quote: `text.slice(start, end) === quote`.
 * Signals are advisory evidence, never a verdict (AGENTS.md #14), so labels
 * describe what the post says, not what the employer is.
 *
 * Seed list: docs/research/POST_CHECK_SIGNALS.md. Not built here (they need
 * employer data or a registry, not text rules): S04, S07, S10. See Q-22.
 */

interface Rule {
  readonly id: string;
  readonly label: string;
  readonly patterns: readonly RegExp[];
  /** When true, a negation just before or after the match ("no placement fee") drops it. */
  readonly negatable: boolean;
}

const AMOUNT = String.raw`(?:₱|php\s?|p\s?)\d[\d,.]*`;
const FEE_WORD = String.raw`(?:registration|processing|placement|activation|application|reservation|slot|training|medical|uniform|membership|insurance|clearance)\s+fee`;
const CHAT_APP = String.raw`(?:telegram|viber|whatsapp|messenger|wechat)`;
const CLAUSE = String.raw`[^.!?\n]`;

const RULES: readonly Rule[] = [
  {
    id: "S01",
    label: "Asks for a fee to apply, process or activate",
    negatable: true,
    patterns: [
      new RegExp(
        String.raw`(?:\b(?:pay|send|deposit)\s+(?:the\s+|a\s+|an\s+)?(?:${AMOUNT}\s+)?)?\b${FEE_WORD}\b(?:\s+(?:via|through|thru|using)\s+\w+)?`,
        "giu",
      ),
      /\bbayad\s+muna\b/giu,
      new RegExp(
        String.raw`\b(?:pay|send|deposit)\b${CLAUSE}{0,40}?\b(?:via|through|thru|using)\s+(?:gcash|maya|paymaya|palawan|western\s+union)\b`,
        "giu",
      ),
    ],
  },
  {
    id: "S02",
    label: "Asks for an OTP, PIN, password, bank details or ID selfie",
    negatable: true,
    patterns: [
      new RegExp(
        String.raw`\b(?:send|provide|submit|give|share|tell|magpadala)\b${CLAUSE}{0,40}?\b(?:otp|one[- ]time\s+(?:pin|password)|(?:atm|gcash|bank)\s+(?:pin|password)|pin\s+code|password|bank\s+(?:account|details|card)|atm\s+card|selfie\s+(?:with|holding)\s+(?:your\s+)?id)\b`,
        "giu",
      ),
    ],
  },
  {
    id: "S03",
    label: "Hires through a chat app only, or with no interview",
    negatable: false,
    patterns: [
      new RegExp(String.raw`\b${CHAT_APP}\b\s+(?:only|lang|exclusively)\b`, "giu"),
      new RegExp(String.raw`\b(?:only|exclusively)\s+(?:on|via|through|thru|in|sa)\s+${CHAT_APP}\b`, "giu"),
      /\bno\s+interview\s+(?:needed|required|necessary)\b/giu,
      /\bwalang\s+interview\b/giu,
      /\bwithout\s+(?:an\s+|any\s+)?interview\b/giu,
    ],
  },
  {
    id: "S05",
    label: "Asks you to buy something or recruit others",
    negatable: true,
    patterns: [
      new RegExp(
        String.raw`\b(?:buy|purchase|bili|bumili)\b${CLAUSE}{0,30}?\b(?:software|starter\s*kit|equipment|laptop|package|membership|gift\s*cards?)\b`,
        "giu",
      ),
      /\bstarter\s*kit\b/giu,
      new RegExp(String.raw`\brecruit\b${CLAUSE}{0,30}?\b(?:others|friends|members|downlines?)\b`, "giu"),
      new RegExp(String.raw`\binvest(?:ment)?\b${CLAUSE}{0,30}?${AMOUNT}`, "giu"),
    ],
  },
  {
    id: "S06",
    label: "Offers overseas direct hiring or hiring with no agency",
    negatable: false,
    patterns: [
      new RegExp(String.raw`\bdirect[\s-]*hir(?:e|ing)\b${CLAUSE}{0,30}?\b(?:abroad|overseas|ofw)\b`, "giu"),
      new RegExp(String.raw`\b(?:abroad|overseas)\b${CLAUSE}{0,30}?\bdirect[\s-]*hir(?:e|ing)\b`, "giu"),
      /\bno\s+agency\b/giu,
      /\bwithout\s+(?:an\s+)?agency\b/giu,
    ],
  },
  {
    id: "S08",
    label: "Promises instant hiring or pushes limited slots",
    negatable: false,
    patterns: [
      /\bhired\s+(?:agad|na\s+agad|immediately|on\s+the\s+spot)\b/giu,
      /\b(?:limited|few)\s+slots?\b/giu,
      /\bslots?\s+(?:are\s+)?(?:limited|filling\s+up|almost\s+full)\b/giu,
    ],
  },
  {
    id: "S09",
    label: "Names a destination tied to scam-compound warnings",
    negatable: false,
    patterns: [/\b(?:cambodia|myanmar)\b/giu],
  },
];

/** Words just before a match that flip its meaning ("no placement fee", "walang bayad"). */
const NEGATION_BEFORE = /\b(?:no|not|without|zero|never|non|walang|wala|hindi|free\s+of|don'?t|do\s+not|never\s+ask)\b[^.!?\n]{0,25}$/iu;
/** Words just after a match that flip it ("registration fee is not required"). */
const NEGATION_AFTER = /^\s*(?:is\s+|are\s+)?(?:not\s+required|free|waived|libre|not\s+needed|not\s+charged)\b/iu;

const MAX_PER_RULE = 3;

/** Longest post Post Check accepts, in characters (DECISIONS #43). Also bounds regex work. */
export const MAX_POST_CHARS = 6000;

export interface PostSignal extends Signal {
  /** Offset of the quote in the post text, in UTF-16 code units. */
  readonly start: number;
  readonly end: number;
}

export interface PostCheckResult {
  readonly signals: readonly PostSignal[];
  /** How many rules ran, so "0 signals" can say "0 of N checks fired". */
  readonly rulesRun: number;
}

function isNegated(text: string, start: number, end: number): boolean {
  return NEGATION_BEFORE.test(text.slice(Math.max(0, start - 40), start)) || NEGATION_AFTER.test(text.slice(end, end + 30));
}

/** Run every rule over the post. Same input, same output (FR-18). */
export function checkPost(text: string): PostCheckResult {
  const signals: PostSignal[] = [];
  for (const rule of RULES) {
    const taken: Array<[number, number]> = [];
    let count = 0;
    for (const pattern of rule.patterns) {
      // Fresh regex per run: global regexes keep lastIndex between calls.
      for (const m of text.matchAll(new RegExp(pattern.source, pattern.flags))) {
        if (count >= MAX_PER_RULE) break;
        const start = m.index;
        const end = start + m[0].length;
        if (m[0].trim().length === 0) continue;
        if (taken.some(([s, e]) => start < e && end > s)) continue; // same span already reported by this rule
        if (rule.negatable && isNegated(text, start, end)) continue;
        taken.push([start, end]);
        count += 1;
        signals.push({ ruleId: rule.id, label: rule.label, quote: text.slice(start, end), start, end });
      }
    }
  }
  signals.sort((a, b) => a.start - b.start || a.ruleId.localeCompare(b.ruleId));
  return { signals, rulesRun: RULES.length };
}
