"""LLM clients (M2): Ollama and OpenAI-compatible, tested against a fake HTTP transport.

No network and no real model is used. All text here is synthetic (NFR-11).
"""
from __future__ import annotations

import json
from collections.abc import Callable

import httpx
import pytest
from pydantic import BaseModel

from app.llm.base import (
    LLMClient,
    LLMModelMissingError,
    LLMOutputError,
    LLMQuotaError,
    LLMUnavailableError,
)
from app.llm.ollama_client import OllamaClient
from app.llm.openai_compat_client import OpenAICompatClient

Handler = Callable[[httpx.Request], httpx.Response]

SECRET_PROMPT = "SYNTHETIC-RESUME-TEXT Juan dela Cruz, BS IT, OJT at Acme"
FAKE_KEY = "test-key-not-real"


class Verdict(BaseModel):
    rating: str
    count: int


GOOD = json.dumps({"rating": "strong", "count": 2})
WRONG_SHAPE = json.dumps({"rating": "strong"})  # valid JSON, fails the schema


class Recorder:
    """Wraps a handler and keeps every request it saw."""

    def __init__(self, handler: Handler) -> None:
        self.handler = handler
        self.requests: list[httpx.Request] = []

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.handler(request)

    def body(self, index: int = 0) -> dict:
        return json.loads(self.requests[index].content)


def ollama(handler: Handler) -> tuple[OllamaClient, Recorder]:
    rec = Recorder(handler)
    client = OllamaClient(
        base_url="http://ollama.test",
        model="qwen2.5:7b",
        embed_model="nomic-embed-text",
        http=httpx.Client(transport=httpx.MockTransport(rec)),
    )
    return client, rec


def openai(handler: Handler, **kwargs: object) -> tuple[OpenAICompatClient, Recorder]:
    rec = Recorder(handler)
    client = OpenAICompatClient(
        base_url="http://hosted.test/v1",
        api_key=FAKE_KEY,
        model="some-free-model",
        embed_model="some-embed-model",
        http=httpx.Client(transport=httpx.MockTransport(rec)),
        **kwargs,  # type: ignore[arg-type]
    )
    return client, rec


def ollama_reply(content: str) -> httpx.Response:
    return httpx.Response(200, json={
        "model": "qwen2.5:7b",
        "message": {"role": "assistant", "content": content},
        "prompt_eval_count": 120,
        "eval_count": 30,
    })


def openai_reply(content: str) -> httpx.Response:
    return httpx.Response(200, json={
        "model": "some-free-model",
        "choices": [{"message": {"role": "assistant", "content": content}}],
        "usage": {"prompt_tokens": 110, "completion_tokens": 25},
    })


def sequence(*replies: httpx.Response) -> Handler:
    queue = list(replies)

    def handler(_: httpx.Request) -> httpx.Response:
        return queue.pop(0)

    return handler


def raises(exc: Exception) -> Handler:
    def handler(_: httpx.Request) -> httpx.Response:
        raise exc

    return handler


# --- interface -------------------------------------------------------------------------


def test_FR21_both_clients_satisfy_llm_client_interface() -> None:
    oc, _ = ollama(lambda r: ollama_reply(GOOD))
    hc, _ = openai(lambda r: openai_reply(GOOD))
    assert isinstance(oc, LLMClient)
    assert isinstance(hc, LLMClient)
    assert oc.provider == "ollama"
    assert hc.provider == "openai_compat"


# --- structured output: Ollama ---------------------------------------------------------


def test_NFR02_ollama_sends_temperature_zero_and_schema() -> None:
    client, rec = ollama(lambda r: ollama_reply(GOOD))
    client.generate_structured(SECRET_PROMPT, Verdict, system="You are a judge.")
    body = rec.body()
    assert rec.requests[0].url.path == "/api/chat"
    assert body["options"]["temperature"] == 0
    assert body["stream"] is False
    assert body["format"] == Verdict.model_json_schema()
    assert body["messages"] == [
        {"role": "system", "content": "You are a judge."},
        {"role": "user", "content": SECRET_PROMPT},
    ]


def test_FR14_ollama_result_carries_metadata_for_call_log() -> None:
    client, _ = ollama(lambda r: ollama_reply(GOOD))
    result = client.generate_structured(SECRET_PROMPT, Verdict)
    assert result.data == Verdict(rating="strong", count=2)
    assert result.provider == "ollama"
    assert result.model == "qwen2.5:7b"
    assert result.prompt_tokens == 120
    assert result.completion_tokens == 30
    assert result.attempts == 1
    assert result.latency_ms >= 0


def test_NFR04_ollama_bad_json_is_retried_once_then_succeeds() -> None:
    client, rec = ollama(sequence(ollama_reply("not json at all"), ollama_reply(GOOD)))
    result = client.generate_structured(SECRET_PROMPT, Verdict)
    assert result.data.count == 2
    assert result.attempts == 2
    assert len(rec.requests) == 2


def test_NFR04_ollama_schema_mismatch_twice_raises_output_error() -> None:
    client, rec = ollama(sequence(ollama_reply(WRONG_SHAPE), ollama_reply(WRONG_SHAPE)))
    with pytest.raises(LLMOutputError):
        client.generate_structured(SECRET_PROMPT, Verdict)
    assert len(rec.requests) == 2  # one retry, never more


def test_NFR04_ollama_down_raises_clear_unavailable_error() -> None:
    client, rec = ollama(raises(httpx.ConnectError("connection refused")))
    with pytest.raises(LLMUnavailableError) as err:
        client.generate_structured(SECRET_PROMPT, Verdict)
    assert "ollama" in str(err.value).lower()
    assert len(rec.requests) == 1  # transport failures are not retried here; the router falls back


def test_FR21_ollama_timeout_raises_unavailable_error() -> None:
    client, _ = ollama(raises(httpx.ReadTimeout("timed out")))
    with pytest.raises(LLMUnavailableError) as err:
        client.generate_structured(SECRET_PROMPT, Verdict)
    assert "timed out" in str(err.value).lower()


def test_NFR04_ollama_missing_model_raises_model_missing_with_pull_hint() -> None:
    client, _ = ollama(
        lambda r: httpx.Response(404, json={"error": "model 'qwen2.5:7b' not found"})
    )
    with pytest.raises(LLMModelMissingError) as err:
        client.generate_structured(SECRET_PROMPT, Verdict)
    assert "ollama pull qwen2.5:7b" in str(err.value)
    assert isinstance(err.value, LLMUnavailableError)  # router treats it as "try the next one"


# --- structured output: OpenAI-compatible ----------------------------------------------


def test_NFR02_openai_compat_sends_temperature_zero_and_json_schema() -> None:
    client, rec = openai(lambda r: openai_reply(GOOD))
    client.generate_structured(SECRET_PROMPT, Verdict, system="You are a judge.")
    body = rec.body()
    assert rec.requests[0].url.path == "/v1/chat/completions"
    assert rec.requests[0].headers["authorization"] == f"Bearer {FAKE_KEY}"
    assert body["temperature"] == 0
    assert body["model"] == "some-free-model"
    assert body["response_format"]["type"] == "json_schema"
    assert body["response_format"]["json_schema"]["schema"] == Verdict.model_json_schema()
    assert body["messages"][0] == {"role": "system", "content": "You are a judge."}
    assert body["messages"][1] == {"role": "user", "content": SECRET_PROMPT}


def test_NFR02_openai_compat_json_object_mode_for_providers_without_json_schema() -> None:
    client, rec = openai(lambda r: openai_reply(GOOD), response_format="json_object")
    client.generate_structured(SECRET_PROMPT, Verdict)
    assert rec.body()["response_format"] == {"type": "json_object"}
    assert rec.body()["temperature"] == 0


def test_FR14_openai_compat_result_carries_metadata_for_call_log() -> None:
    client, _ = openai(lambda r: openai_reply(GOOD))
    result = client.generate_structured(SECRET_PROMPT, Verdict)
    assert result.data == Verdict(rating="strong", count=2)
    assert result.provider == "openai_compat"
    assert result.model == "some-free-model"
    assert result.prompt_tokens == 110
    assert result.completion_tokens == 25
    assert result.attempts == 1


def test_FR21_openai_compat_429_raises_quota_error_without_retry() -> None:
    client, rec = openai(lambda r: httpx.Response(429, json={"error": {"message": "rate limit"}}))
    with pytest.raises(LLMQuotaError):
        client.generate_structured(SECRET_PROMPT, Verdict)
    assert len(rec.requests) == 1
    assert issubclass(LLMQuotaError, LLMUnavailableError)


def test_FR21_openai_compat_server_error_raises_unavailable() -> None:
    client, _ = openai(lambda r: httpx.Response(503, text="upstream down"))
    with pytest.raises(LLMUnavailableError) as err:
        client.generate_structured(SECRET_PROMPT, Verdict)
    assert "503" in str(err.value)


def test_NFR04_openai_compat_bad_json_twice_raises_output_error() -> None:
    client, rec = openai(sequence(openai_reply("```oops"), openai_reply("still not json")))
    with pytest.raises(LLMOutputError):
        client.generate_structured(SECRET_PROMPT, Verdict)
    assert len(rec.requests) == 2


def test_NFR04_openai_compat_unexpected_response_shape_is_retried_then_raises() -> None:
    client, rec = openai(lambda r: httpx.Response(200, json={"choices": []}))
    with pytest.raises(LLMOutputError):
        client.generate_structured(SECRET_PROMPT, Verdict)
    assert len(rec.requests) == 2


def test_NFR04_ollama_unexpected_response_shape_retry_can_recover() -> None:
    client, rec = ollama(
        sequence(httpx.Response(200, json={"message": None}), ollama_reply(GOOD))
    )
    result = client.generate_structured(SECRET_PROMPT, Verdict)
    assert result.attempts == 2
    assert len(rec.requests) == 2


# --- privacy ---------------------------------------------------------------------------


@pytest.mark.parametrize("status", [400, 404, 429, 500])
def test_NFR10_errors_never_contain_prompt_text_model_output_or_key(status: int) -> None:
    """A provider may echo the request in its error body; none of it may reach our errors."""
    echo = httpx.Response(status, text=f"bad request: {SECRET_PROMPT}")
    for client in (ollama(lambda r: echo)[0], openai(lambda r: echo)[0]):
        with pytest.raises(LLMUnavailableError) as err:
            client.generate_structured(SECRET_PROMPT, Verdict)
        assert "SYNTHETIC-RESUME-TEXT" not in str(err.value)
        assert "SYNTHETIC-RESUME-TEXT" not in repr(err.value)
        assert FAKE_KEY not in str(err.value)


def test_NFR10_output_error_does_not_contain_model_output() -> None:
    leaked = f"I cannot answer. {SECRET_PROMPT}"
    client, _ = ollama(sequence(ollama_reply(leaked), ollama_reply(leaked)))
    with pytest.raises(LLMOutputError) as err:
        client.generate_structured(SECRET_PROMPT, Verdict)
    assert "SYNTHETIC-RESUME-TEXT" not in str(err.value)
    # no chained exception carrying the raw text either
    assert err.value.__cause__ is None
    assert err.value.__context__ is None


# --- embeddings ------------------------------------------------------------------------


def test_FR05_ollama_embed_returns_one_vector_per_text() -> None:
    client, rec = ollama(
        lambda r: httpx.Response(200, json={"embeddings": [[0.1, 0.2], [0.3, 0.4]]})
    )
    vectors = client.embed(["alpha", "beta"])
    assert vectors == [[0.1, 0.2], [0.3, 0.4]]
    assert rec.requests[0].url.path == "/api/embed"
    assert rec.body() == {"model": "nomic-embed-text", "input": ["alpha", "beta"]}


def test_FR05_openai_compat_embed_returns_vectors_in_input_order() -> None:
    client, rec = openai(lambda r: httpx.Response(200, json={"data": [
        {"index": 1, "embedding": [0.3, 0.4]},
        {"index": 0, "embedding": [0.1, 0.2]},
    ]}))
    vectors = client.embed(["alpha", "beta"])
    assert vectors == [[0.1, 0.2], [0.3, 0.4]]
    assert rec.requests[0].url.path == "/v1/embeddings"
    assert rec.body() == {"model": "some-embed-model", "input": ["alpha", "beta"]}


def test_FR05_embed_empty_input_makes_no_call() -> None:
    oc, orec = ollama(lambda r: httpx.Response(500))
    hc, hrec = openai(lambda r: httpx.Response(500))
    assert oc.embed([]) == []
    assert hc.embed([]) == []
    assert orec.requests == [] and hrec.requests == []


def test_NFR04_embed_wrong_vector_count_raises_output_error() -> None:
    client, _ = ollama(lambda r: httpx.Response(200, json={"embeddings": [[0.1, 0.2]]}))
    with pytest.raises(LLMOutputError):
        client.embed(["alpha", "beta"])


@pytest.mark.parametrize("bad", [
    [[0.1, 0.2], "oops"],            # not a vector
    [[0.1, 0.2], [0.3]],             # inconsistent dimensions
    [[0.1, 0.2], []],                # empty vector
    [[0.1, 0.2], [0.3, "x"]],        # non-numeric value
    [[0.1, 0.2], [0.3, True]],       # bool is not a number here
])
def test_NFR04_embed_malformed_vectors_raise_output_error(bad: list) -> None:
    client, _ = ollama(lambda r: httpx.Response(200, json={"embeddings": bad}))
    with pytest.raises(LLMOutputError):
        client.embed(["alpha", "beta"])
