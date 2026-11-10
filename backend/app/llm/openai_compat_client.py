"""Client for free hosted providers that expose an OpenAI-compatible API.

Which providers form the chain, and whether each supports `json_schema` or only
`json_object` response formats, is an open fact (OPEN_QUESTIONS Q-07, Q-17). Both modes
are supported here; either way the output is validated against the Pydantic schema.
"""
from __future__ import annotations

from typing import Any, Literal

import httpx

from app.llm.base import (
    TEMPERATURE,
    LLMModelMissingError,
    LLMOutputError,
    LLMQuotaError,
    LLMResult,
    LLMUnavailableError,
    RawReply,
    T,
    as_int,
    parse_json,
    run_structured,
    send,
)

DEFAULT_TIMEOUT_SECONDS = 30.0

ResponseFormat = Literal["json_schema", "json_object"]


class OpenAICompatClient:
    provider = "openai_compat"

    def __init__(
        self,
        *,
        base_url: str,
        api_key: str,
        model: str,
        embed_model: str = "",
        response_format: ResponseFormat = "json_schema",
        timeout: float = DEFAULT_TIMEOUT_SECONDS,
        http: httpx.Client | None = None,
    ) -> None:
        self.model = model
        self.embed_model = embed_model
        self._base_url = base_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {api_key}"}
        self._response_format = response_format
        self._http = http or httpx.Client(timeout=timeout)

    def generate_structured(
        self, prompt: str, schema: type[T], *, system: str | None = None
    ) -> LLMResult[T]:
        messages: list[dict[str, str]] = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})
        response_format: dict[str, Any]
        if self._response_format == "json_schema":
            response_format = {
                "type": "json_schema",
                "json_schema": {"name": schema.__name__, "schema": schema.model_json_schema()},
            }
        else:
            response_format = {"type": "json_object"}
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": TEMPERATURE,
            "response_format": response_format,
        }

        def call() -> RawReply:
            body = self._post("/chat/completions", payload)
            try:
                content = body["choices"][0]["message"]["content"]
            except (KeyError, IndexError, TypeError):
                content = None
            if not isinstance(content, str):
                raise LLMOutputError(f"{self.provider} returned an unexpected response shape")
            usage = body.get("usage")
            usage = usage if isinstance(usage, dict) else {}
            return RawReply(
                content=content,
                prompt_tokens=as_int(usage.get("prompt_tokens")),
                completion_tokens=as_int(usage.get("completion_tokens")),
            )

        return run_structured(call, schema, provider=self.provider, model=self.model)

    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        body = self._post("/embeddings", {"model": self.embed_model, "input": texts})
        data = body.get("data")
        if not isinstance(data, list) or len(data) != len(texts):
            raise LLMOutputError(f"{self.provider} returned an unexpected number of embeddings")
        try:
            ordered = sorted(data, key=lambda item: item["index"])
            return [item["embedding"] for item in ordered]
        except (KeyError, TypeError):
            raise LLMOutputError(
                f"{self.provider} returned an unexpected embeddings shape"
            ) from None

    def _post(self, path: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = send(
            self._http, self.provider, f"{self._base_url}{path}", payload, self._headers
        )
        status = response.status_code
        if status == 429:
            raise LLMQuotaError(f"{self.provider} quota or rate limit reached (HTTP 429)")
        if status == 404:
            raise LLMModelMissingError(
                f"{self.provider} model or endpoint not found: {payload['model']} (HTTP 404)"
            )
        if status >= 400:
            raise LLMUnavailableError(f"{self.provider} returned HTTP {status}")
        return parse_json(response, self.provider)
