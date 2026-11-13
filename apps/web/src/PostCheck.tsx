import { useRef, useState } from "react";
import { toSegments, type ApiSignal } from "./segments";

const API = import.meta.env.VITE_API_URL ?? "/api";
const MAX_CHARS = 6000; // mirrors MAX_POST_CHARS in @resibo/proof (DECISIONS #43)

interface Result {
  /** The exact text that was checked, so offsets line up even if the box is edited later. */
  checked: string;
  signals: ApiSignal[];
  rulesRun: number;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; result: Result }
  | { kind: "error"; message: string };

const SAMPLE = `URGENT HIRING! Data Encoder (WFH). No experience needed, pay P800 per day.
To secure your slot, pay the P500 registration fee via GCash.
Message us on Telegram only. No interview needed. Hired agad!`;

async function runCheck(post: string, signal: AbortSignal): Promise<Result> {
  let res: Response;
  try {
    res = await fetch(`${API}/post-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post }),
      signal,
    });
  } catch {
    throw new Error(
      "Can't reach the server. On the public preview the server is not deployed yet. Run the project locally to try it.",
    );
  }
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof body === "object" && body !== null && "error" in body
        ? (body as { error?: { message?: string } }).error?.message
        : undefined;
    throw new Error(message ?? "The check failed. Try again.");
  }
  const ok = body as { signals: ApiSignal[]; rules_run: number };
  return { checked: post, signals: ok.signals, rulesRun: ok.rules_run };
}

export function PostCheck() {
  const [text, setText] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const ctrl = useRef<AbortController | null>(null);

  const empty = text.trim().length === 0;
  const tooLong = text.length > MAX_CHARS;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (empty || tooLong) return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setState({ kind: "loading" });
    try {
      const result = await runCheck(text, ctrl.current.signal);
      setState({ kind: "done", result });
    } catch (err) {
      if (ctrl.current?.signal.aborted) return;
      setState({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong." });
    }
  }

  return (
    <div className="tool">
      <section aria-labelledby="input-h">
        <h1>Post Check</h1>
        <p className="lede">
          Paste a job post. Resibo points at the lines worth a second look and quotes each one exactly.
        </p>
        <form onSubmit={submit}>
          <div className="field">
            <label id="input-h" htmlFor="post">
              Job post
            </label>
            <textarea
              id="post"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Paste the text of the post here"
              aria-describedby="counter"
            />
            <div className="counter" id="counter">
              <button type="button" className="linklike" onClick={() => setText(SAMPLE)}>
                Use a fictional sample
              </button>
              <span className={tooLong ? "over" : undefined}>
                {text.length.toLocaleString("en-US")} / {MAX_CHARS.toLocaleString("en-US")}
              </span>
            </div>
          </div>
          <div className="actions">
            <button className="btn" type="submit" disabled={empty || tooLong || state.kind === "loading"}>
              {state.kind === "loading" ? "Checking" : "Check this post"}
            </button>
          </div>
          <p className="meta">Checked on the server and not saved. Nothing is stored or logged.</p>
        </form>
      </section>

      <section aria-labelledby="out-h" aria-live="polite" className="out">
        {state.kind === "idle" && (
          <div className="placeholder">
            <h2 id="out-h">Results</h2>
            <p>Signals appear here, with the matching lines highlighted in your post.</p>
          </div>
        )}
        {state.kind === "loading" && (
          <div className="placeholder">
            <h2 id="out-h">Results</h2>
            <p>Checking the post.</p>
          </div>
        )}
        {state.kind === "error" && (
          <div className="note note--reject" role="alert">
            <strong>Could not check the post.</strong> {state.message}
          </div>
        )}
        {state.kind === "done" && <Results result={state.result} />}
      </section>
    </div>
  );
}

function Results({ result }: { result: Result }) {
  const { signals, checked, rulesRun } = result;
  const segments = toSegments(checked, signals);
  return (
    <div>
      <h2 id="out-h" className="count">
        {signals.length === 0
          ? "No signals found"
          : `${signals.length} ${signals.length === 1 ? "signal" : "signals"} found`}
      </h2>
      {signals.length === 0 ? (
        <p className="meta">
          None of the {rulesRun} checks fired. That does not mean the post is safe: check the employer through
          official channels.
        </p>
      ) : (
        <p className="meta">
          Each signal points at a line in the post. None of this proves anything about the employer.
        </p>
      )}

      <h3 className="sub">The post, annotated</h3>
      <p className="annotated">
        {segments.map((s, i) =>
          s.flagged ? (
            <mark key={i}>{s.text}</mark>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>

      {signals.length > 0 && (
        <>
          <h3 className="sub">Signals</h3>
          <ol className="signals">
            {signals.map((s, i) => (
              <li key={`${s.rule_id}-${s.start}-${i}`}>
                <p className="item-title">
                  {s.label} <span className="badge">{s.rule_id}</span>
                </p>
                <p className="proof">
                  <span className="quote">{s.quote}</span>
                </p>
              </li>
            ))}
          </ol>
        </>
      )}

      <p className="note">
        <strong>Signals, not verdicts.</strong> To check an employer, use the official sites:{" "}
        <a href="https://www.dole.gov.ph" target="_blank" rel="noreferrer noopener">
          DOLE
        </a>
        ,{" "}
        <a href="https://philjobnet.gov.ph" target="_blank" rel="noreferrer noopener">
          PhilJobNet
        </a>{" "}
        for local jobs, and{" "}
        <a href="https://dmw.gov.ph" target="_blank" rel="noreferrer noopener">
          DMW
        </a>{" "}
        for overseas agencies.
      </p>
    </div>
  );
}
