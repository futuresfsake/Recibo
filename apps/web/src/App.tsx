import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "/api";
const PREVIEW = `${import.meta.env.BASE_URL}prototype/`;

type ApiState = "checking" | "ok" | "degraded" | "offline";

const STATUS_TEXT: Record<ApiState, string> = {
  checking: "Checking the server",
  ok: "Server online",
  degraded: "Server online, AI explanations off",
  offline: "Server not deployed yet",
};

export function App() {
  const [api, setApi] = useState<ApiState>("checking");

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${API}/health`, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<{ status: "ok" | "degraded" }>)
      .then((body) => setApi(body.status))
      .catch(() => {
        if (!ctrl.signal.aborted) setApi("offline");
      });
    return () => ctrl.abort();
  }, []);

  return (
    <div className="screen">
      <header className="masthead">
        <a className="wordmark" href={import.meta.env.BASE_URL}>
          resibo
        </a>
        <span className="tag">May resibo ka?</span>
      </header>

      <main className="home">
        <h1>Every claim comes with proof.</h1>
        <p className="lede">
          Check a job post for red flags. See how your resume fits, with the exact lines that prove it.
        </p>

        <section className="receipt" aria-labelledby="tools">
          <p className="serial">OR No. 000001</p>
          <h2 id="tools">Three tools</h2>
          <div className="toolrow">
            <span className="no">01</span>
            <span>
              <span className="name">Post Check</span>
              <span className="desc">Red flags in a job post, each with the exact quote.</span>
            </span>
          </div>
          <div className="toolrow">
            <span className="no">02</span>
            <span>
              <span className="name">Fit Check</span>
              <span className="desc">Your resume against a job post. Every rating cites a verified quote.</span>
            </span>
          </div>
          <div className="toolrow">
            <span className="no">03</span>
            <span>
              <span className="name">Next Steps</span>
              <span className="desc">Reframing tips from verified experience, plus honest gaps.</span>
            </span>
          </div>
          <hr className="rule" />
          <p className="meta">Not built yet. Coming one tool at a time.</p>
          <div className="actions">
            <a className="btn" href={`${PREVIEW}index.html`}>
              See the design preview
            </a>
          </div>
        </section>

        <p className="meta">
          The preview is a mock-up with sample data; nothing is analysed. Your resume and job posts will never be
          saved on a server.
        </p>
        <p className={`status status-${api}`} role="status">
          {STATUS_TEXT[api]}
        </p>
      </main>
    </div>
  );
}
