import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL ?? "/api";

type ApiState = "checking" | "ok" | "degraded" | "offline";

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
    <main>
      <h1>Resibo</h1>
      <p className="tagline">May resibo ka? Every match comes with proof.</p>
      <ul className="tools">
        <li>
          <strong>Post Check</strong> Red-flag signals in a job post, each with the exact quote.
        </li>
        <li>
          <strong>Fit Check</strong> Your resume against a job post. Every rating cites a verified quote.
        </li>
        <li>
          <strong>Next Steps</strong> Reframing tips from verified experience, plus honest gaps.
        </li>
      </ul>
      <p className="preview">
        The tools are not built yet.{" "}
        <a href={`${import.meta.env.BASE_URL}prototype/index.html`}>See the design preview</a> (static
        mock-up, sample data only, nothing is analysed).
      </p>
      <p className={`status status-${api}`} role="status">
        API: {api}
      </p>
    </main>
  );
}
