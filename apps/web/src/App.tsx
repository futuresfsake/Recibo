import { useEffect, useState } from "react";
import { PostCheck } from "./PostCheck";

const API = import.meta.env.VITE_API_URL ?? "/api";
const BASE = import.meta.env.BASE_URL;

type ApiState = "checking" | "ok" | "degraded" | "offline";
type Route = "post-check" | "fit-check" | "history";

const STATUS_TEXT: Record<ApiState, string> = {
  checking: "Checking the server",
  ok: "Server online",
  degraded: "Server online, AI explanations off",
  offline: "Server not deployed yet",
};

const NAV: ReadonlyArray<{ route: Route; label: string }> = [
  { route: "post-check", label: "Post Check" },
  { route: "fit-check", label: "Fit Check" },
  { route: "history", label: "History" },
];

function routeFromHash(): Route {
  const h = window.location.hash.replace(/^#\/?/, "");
  return h === "fit-check" || h === "history" ? h : "post-check";
}

function useRoute(): Route {
  const [route, setRoute] = useState<Route>(routeFromHash);
  useEffect(() => {
    const on = () => setRoute(routeFromHash());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

function useApiStatus(): ApiState {
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
  return api;
}

function NotBuilt({ name, why }: { name: string; why: string }) {
  return (
    <div className="narrow">
      <h1>{name}</h1>
      <p className="lede">{why}</p>
      <p>
        <a className="btn btn--ghost btn--small" href="#/post-check">
          Back to Post Check
        </a>
      </p>
      <p className="meta">
        The screens exist as a static design preview:{" "}
        <a href={`${BASE}prototype/index.html`}>open the preview</a>. It uses sample data only.
      </p>
    </div>
  );
}

export function App() {
  const route = useRoute();
  const api = useApiStatus();

  return (
    <div className="screen">
      <header className="masthead">
        <a className="wordmark" href="#/post-check">
          resibo
        </a>
        <nav className="topnav" aria-label="Tools">
          {NAV.map((n) => (
            <a key={n.route} href={`#/${n.route}`} aria-current={route === n.route ? "page" : undefined}>
              {n.label}
            </a>
          ))}
        </nav>
      </header>

      <main className="tool-page">
        {route === "post-check" && <PostCheck />}
        {route === "fit-check" && (
          <NotBuilt
            name="Fit Check"
            why="Not built yet. It needs the resume parser and the quote verifier first (milestone M4)."
          />
        )}
        {route === "history" && (
          <NotBuilt
            name="History"
            why="Not built yet. Past checks will be saved in this browser only, never on the server."
          />
        )}
      </main>

      <footer className="foot">
        <p className={`status status-${api}`} role="status">
          {STATUS_TEXT[api]}
        </p>
        <p className="meta">Resibo is an early build. Signals are not verdicts.</p>
      </footer>

      <nav className="tabbar" aria-label="Tools">
        {NAV.map((n) => (
          <a key={n.route} href={`#/${n.route}`} aria-current={route === n.route ? "page" : undefined}>
            {n.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
