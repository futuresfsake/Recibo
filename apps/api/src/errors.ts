import type { ErrorRequestHandler, RequestHandler } from "express";

/** Every error response from the API has this JSON shape (NFR-04: clear errors). */
export interface ApiError {
  error: { code: string; message: string };
}

/** An error the caller can fix. Carries the HTTP status it maps to. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (req, res) => {
  const body: ApiError = {
    error: { code: "not_found", message: `No route for ${req.method} ${req.path}` },
  };
  res.status(404).json(body);
};

// Express identifies error middleware by its four-argument signature, so `_next` must stay.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    const body: ApiError = { error: { code: err.code, message: err.message } };
    res.status(err.status).json(body);
    return;
  }
  // Malformed JSON and oversized bodies come from body-parser with their own status.
  const status =
    typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
      ? err.status
      : 500;
  if (status >= 400 && status < 500) {
    const body: ApiError = {
      error: { code: status === 413 ? "payload_too_large" : "bad_request", message: "The request could not be processed" },
    };
    res.status(status).json(body);
    return;
  }
  // Never echo internals or request text (NFR-10). Log metadata only.
  console.error(`unhandled error: ${err instanceof Error ? err.name : "unknown"}`);
  const body: ApiError = { error: { code: "internal_error", message: "Something went wrong" } };
  res.status(500).json(body);
};
