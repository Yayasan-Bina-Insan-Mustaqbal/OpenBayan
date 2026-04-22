import json
import os
import urllib.request
from typing import Any

from prefect import task


def get_ollama_url() -> str:
    """Return the configured Ollama URL without a trailing slash."""
    url = os.environ.get("OLLAMA_URL") or os.environ.get("OLLAMA_HOST")
    if not url:
        raise RuntimeError("Set OLLAMA_URL or OLLAMA_HOST before calling Ollama.")
    return url.rstrip("/")


def post_ollama(path: str, payload: dict[str, Any], timeout: int = 60) -> dict[str, Any]:
    """POST JSON to the Ollama API."""
    url = f"{get_ollama_url()}{path}"
    request = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.load(response)


@task(name="List Ollama Models")
def list_ollama_models() -> list[str]:
    """Fetch model names from the configured Ollama host."""
    with urllib.request.urlopen(f"{get_ollama_url()}/api/tags", timeout=10) as response:
        data = json.load(response)
    return [model["name"] for model in data.get("models", [])]


@task(name="Generate Ollama Embedding")
def generate_embedding(text: str) -> list[float]:
    """Generate one embedding using the configured Ollama embedding model."""
    model = os.environ.get("OLLAMA_EMBED_MODEL", "mxbai-embed-large:latest")
    data = post_ollama(
        "/api/embeddings",
        {"model": model, "prompt": text},
        timeout=60,
    )
    return data.get("embedding", [])


@task(name="Generate Ollama Text")
def generate_text(prompt: str) -> str:
    """Generate text using the configured Ollama LLM model."""
    model = os.environ.get("OLLAMA_LLM_MODEL", "llama3.1:latest")
    data = post_ollama(
        "/api/generate",
        {"model": model, "prompt": prompt, "stream": False},
        timeout=120,
    )
    return data.get("response", "")
