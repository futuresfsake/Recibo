/** A signal as returned by `POST /post-check`. Offsets index the submitted text. */
export interface ApiSignal {
  rule_id: string;
  label: string;
  quote: string;
  start: number;
  end: number;
}

export interface Segment {
  text: string;
  /** True when this stretch of the post is part of at least one signal's quote. */
  flagged: boolean;
}

/**
 * Split the post into plain and flagged stretches so the quotes can be
 * highlighted in place. Overlapping or touching signals merge into one stretch.
 * The concatenation of all segments is always exactly the input text.
 */
export function toSegments(text: string, signals: readonly ApiSignal[]): Segment[] {
  const ranges = signals
    .map((s) => [Math.max(0, s.start), Math.min(text.length, s.end)] as const)
    .filter(([s, e]) => e > s)
    .sort((a, b) => a[0] - b[0]);

  const merged: Array<[number, number]> = [];
  for (const [s, e] of ranges) {
    const last = merged[merged.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }

  const out: Segment[] = [];
  let pos = 0;
  for (const [s, e] of merged) {
    if (s > pos) out.push({ text: text.slice(pos, s), flagged: false });
    out.push({ text: text.slice(s, e), flagged: true });
    pos = e;
  }
  if (pos < text.length) out.push({ text: text.slice(pos), flagged: false });
  return out;
}
