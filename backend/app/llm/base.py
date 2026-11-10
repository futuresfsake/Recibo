"""`LLMClient` interface, result type, errors, and the shared call-validate-retry loop.

Privacy (NFR-10): nothing in this package logs, and no error message may contain prompt
text, model output, a provider's response body, or an API key. Errors carry only the
provider name, model name, HTTP status and exception class names.
"""
from __future__ import annotations

import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any, Generic, Protocol, TypeVar, runtime_checkable

import httpx
from pydantic import BaseModel, ValidationError

T = TypeVar("T", bound=BaseModel)

TEMPERATURE = 0  # NFR-02: fixed in code, not configurable
MAX_ATTEMPTS = 2  # AGENTS.md rule 7: validate, then exactly one retry


class LLMError(Exception):
    """Base class for every failure raised by an LLM client."""


class LLMUnavailableError(LLMError):
    """The provider could not serve the call (down, timeout, HTTP error).

    The router's signal to try the next provider (FR-21).
    """


class LLMQuotaError(LLMUnavailableError):
    """Rate limit or quota reached (HTTP 429)."""


class LLMModelMissingError(LLMUnavailableError):
    """The provider is up but the requested model is not available."""


class LLMOutputError(LLMError):
    """The provider answered, but the answer was unusable after one retry."""


@dataclass(frozen=True)
class LLMResult(Generic[T]):
    """Validated output plus the metadata the call log needs (FR-14). Holds no prompt text."""

    data: T
    provider: str
    model: str
    latency_ms: int
    prompt_tokens: int | None
    completion_tokens: int | None
    attempts: int


@runtime_checkable
class LLMClient(Protocol):
    provider: str
    model: str

    def generate_structured(
        self, prompt: str, schema: type[T], *, system: str | None = None
    ) -> LLMResult[T]:
        """Return output validated against `schema`, at temperature 0, with one retry."""
        ...

    def embed(self, texts: list[str]) -> list[list[float]]:
        """Return one vector per input text, in input order."""
        ...


@dataclass(frozen=True)
class RawReply:
    """One provider response, before validation."""

    content: str
    prompt_tokens: int | None
    completion_tokens: int | None


def send(
    http: httpx.Client, provider: str, url: str, payload: dict[str, Any],
    headers: dict[str, str] | None = None,
) -> httpx.Response:
    """POST and map transport failures to `LLMUnavailableError`. HTTP status is left to callers."""
    try:
        return http.post(url, json=payload, headers=headers)
    except httpx.TimeoutException:
        raise LLMUnavailableError(f"{provider} timed out") from None
    except httpx.HTTPError as exc:
        raise LLMUnavailableError(f"{provider} unreachable: {type(exc).__name__}") from None


def parse_json(response: httpx.Response, provider: str) -> dict[str, Any]:
    """Decode a 2xx body as a JSON object, or raise `LLMOutputError` without echoing it."""
    try:
        body = response.json()
    except ValueError:
        raise LLMOutputError(f"{provider} returned a non-JSON response") from None
    if not isinstance(body, dict):
        raise LLMOutputError(f"{provider} returned an unexpected response shape")
    return body


def as_int(value: object) -> int | None:
    return value if isinstance(value, int) and not isinstance(value, bool) else None


def validate_vectors(raw: object, expected: int, provider: str) -> list[list[float]]:
    """Check embeddings: `expected` equal-length, non-empty lists of real numbers."""
    if (
        not isinstance(raw, list)
        or len(raw) != expected
        or not all(
            isinstance(v, list)
            and v
            and all(isinstance(x, (int, float)) and not isinstance(x, bool) for x in v)
            for v in raw
        )
        or len({len(v) for v in raw}) > 1
    ):
        raise LLMOutputError(f"{provider} returned malformed embeddings")
    return raw


def run_structured(
    call: Callable[[], RawReply], schema: type[T], *, provider: str, model: str
) -> LLMResult[T]:
    """Call, validate against `schema`, retry once on invalid output.

    Only invalid *output* (including a malformed response envelope) is retried. Transport
    and HTTP failures propagate at once so the router can move to the next provider
    instead of waiting on a dead one.
    """
    started = time.perf_counter()
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            reply = call()
            data = schema.model_validate_json(reply.content)
        except (LLMOutputError, ValidationError):
            # Malformed response shape, bad JSON or schema mismatch all count as one failed
            # attempt. The exception text may quote the model's output, so it is dropped.
            continue
        return LLMResult(
            data=data,
            provider=provider,
            model=model,
            latency_ms=int((time.perf_counter() - started) * 1000),
            prompt_tokens=reply.prompt_tokens,
            completion_tokens=reply.completion_tokens,
            attempts=attempt,
        )
    raise LLMOutputError(
        f"{provider} ({model}) output did not match schema {schema.__name__} "
        f"after {MAX_ATTEMPTS} attempts"
    )
