"""Ollama client (local development). Uses Ollama's native API for schema-constrained output."""
from __future__ import annotations

from typing import Any

import httpx

from app.llm.base import (
    TEMPERATURE,
    LLMModelMissingError,
    LLMOutputError,
    LLMResult,
    LLMUnavailableError,
    RawReply,
    T,
    as_int,
    parse_json,
    run_structured,
    send,
    validate_vectors,
)

DEFAULT_TIMEOUT_SECONDS = 120.0  # a local 7B model on a laptop CPU is slow


class OllamaClient:
    provider = "ollama"

    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        embed_model: str,
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        http: httpx.Client | None = None,
    ) -> None:
        self.model = model
        self.embed_model = embed_model
        self._base_url = base_url.rstrip("/")
        self._http = http or httpx.Client(timeout=timeout)

    def generate_structured(
        self, prompt: str, schema: type[T], *, system: str | None = None
    ) -> LLMResult[T]:
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "format": schema.model_json_schema(),
            "options": {"temperature": TEMPERATURE},
        }

        def call() -> RawReply:
            body = self._post("/api/chat", payload, self.model)
            message = body.get("message")
            content = message.get("content") if isinstance(message, dict) else None
            if not isinstance(content, str):
                raise LLMOutputError("ollama returned an unexpected response shape")
            return RawReply(
                content=content,
                prompt_tokens=as_int(body.get("prompt_eval_count")),
                completion_tokens=as_int(body.get("eval_count")),
            )

        return run_structured(call, schema, provider=self.provider, model=self.model)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        body = self._post(
            "/api/embed", {"model": self.embed_model, "input": texts}, self.embed_model
        )
        return validate_vectors(body.get("embeddings"), len(texts), self.provider)

    def _post(self, path: str, payload: dict[str, Any], model: str) -> dict[str, Any]:
        response = send(self._http, self.provider, f"{self._base_url}{path}", payload)
        if response.status_code == 404:
            raise LLMModelMissingError(
                f"ollama model not available: {model} (run: ollama pull {model})"
            )
        if response.status_code >= 400:
            raise LLMUnavailableError(f"ollama returned HTTP {response.status_code}")
        return parse_json(response, self.provider)
