# Jupyter Notebook Integration Best Practices

This guide explains how to write OpenBayan notebooks that run cleanly inside the Docker-hosted Jupyter Lab service and can evolve into reusable Prefect pipeline code.

The reference example is `OpenBayanBackend/notebooks/jupyter_ollama_smoke_test.ipynb`, which verifies that Jupyter, Prefect, CAMeL Tools, Torch, and an external Ollama host can work together from the same notebook runtime.

## 1. Runtime Contract

OpenBayan notebooks must run inside the `jupyter` service from `OpenBayanBackend/docker-compose.yml`.

Do not run Jupyter, Prefect, or notebook development servers directly on the host. The container is the source of truth for Python versions, installed packages, environment variables, mounted paths, and service networking.

```bash
cd OpenBayanBackend
docker compose up -d --build jupyter prefect-server surrealdb
```

Then open Jupyter Lab:

```text
http://localhost:8888
```

The Compose service starts Jupyter with:

```text
--ServerApp.root_dir=/app/notebooks
```

Because of the volume mount:

```yaml
./notebooks:/app/notebooks
```

any notebook saved in the browser is written to:

```text
OpenBayanBackend/notebooks/
```

## 2. What the Smoke Test Proves

`jupyter_ollama_smoke_test.ipynb` is a good minimal integration notebook because it checks the complete research runtime without writing persistent application data.

It verifies:

| Layer | Smoke test behavior |
|:---|:---|
| Jupyter runtime | Imports `jupyterlab`, prints the notebook root, and runs all cells from `/app/notebooks`. |
| Docker environment | Reads `PREFECT_API_URL`, `OLLAMA_URL`, and `OLLAMA_HOST` from Compose-provided environment variables. |
| Python packages | Imports `torch`, `camel_tools`, and `prefect` from the worker image. |
| CAMeL Tools data | Loads the pretrained MLE disambiguator installed by the worker Dockerfile. |
| Ollama connectivity | Calls `/api/tags` and `/api/embeddings` on the configured Ollama host. |
| Prefect integration | Defines `@task` functions and runs a real `@flow` from inside the notebook. |
| Observability | Emits a flow run that should appear in Prefect UI at `http://localhost:4200`. |

This makes the notebook a runtime smoke test, not a production ingestion pipeline. Keep it small, fast, and safe to rerun.

## 3. Recommended Notebook Structure

Use the same top-to-bottom shape for new notebooks:

```text
1. Title and purpose
2. Runtime imports
3. Environment and path configuration
4. Small helper functions
5. Prefect task definitions
6. Prefect flow definition
7. One explicit execution cell
8. Short result inspection
```

### Title and Purpose

Start with a Markdown cell that answers:

- What does this notebook prove or produce?
- Which services must be running?
- Which external systems are required?
- Where should the result appear?

Example:

```markdown
# OpenBayan Jupyter + Ollama Smoke Test

Verifies that Jupyter, Prefect, CAMeL Tools, Torch, and the configured Ollama host work from the Docker notebook runtime. The final cell runs a Prefect flow visible in the Prefect UI.
```

### Runtime Imports

Keep imports in one early cell. Avoid hidden imports in later cells unless they are only used for an optional experiment.

Good pattern:

```python
from pathlib import Path
import json
import os
import sys
import urllib.request

import torch
from camel_tools.disambig.mle import MLEDisambiguator
from prefect import flow, get_run_logger, task
```

If a notebook needs a new package, add it to `OpenBayanBackend/worker/requirements.txt` and rebuild the Docker image. Do not make committed notebooks depend on `pip install` cells.

```bash
cd OpenBayanBackend
docker compose build jupyter data-worker
docker compose up -d jupyter data-worker
```

## 4. Environment Configuration

Read configuration from environment variables provided by Docker Compose.

Recommended variables:

| Variable | Purpose |
|:---|:---|
| `PREFECT_API_URL` | Prefect API endpoint used by notebook-created flow runs. |
| `SURREAL_WS_URL` | SurrealDB WebSocket endpoint for Python SDK usage. |
| `SURREAL_USER` / `SURREAL_PASS` | Local development database credentials. |
| `OLLAMA_URL` / `OLLAMA_HOST` | External Ollama endpoint. Use one canonical value in code after reading both. |
| `OLLAMA_EMBED_MODEL` | Embedding model name, for example `mxbai-embed-large:latest`. |
| `OLLAMA_LLM_MODEL` | General inference model name. |

Normalize optional URLs once:

```python
OLLAMA_URL = (os.environ.get("OLLAMA_URL") or os.environ.get("OLLAMA_HOST") or "").rstrip("/")
```

Fail early with clear messages when a required integration is missing:

```python
if not OLLAMA_URL:
    raise RuntimeError("Set OLLAMA_URL or OLLAMA_HOST before calling Ollama.")
```

Do not hard-code host-only service addresses inside notebooks. Use Docker service names for container-to-container calls and `localhost` only for browser access from the host.

## 5. Prefect Inside Jupyter

Notebooks are useful for developing Prefect logic because tasks can be edited and rerun interactively. Keep the boundary clean.

Best practices:

- Make each `@task` do one thing: check environment, fetch data, generate embeddings, write records, or validate output.
- Return small JSON-serializable dictionaries instead of large raw model outputs.
- Keep task inputs explicit. Avoid reading many globals from inside task bodies.
- Use `get_run_logger()` inside the flow for summary logs.
- Make the final execution cell obvious and easy to rerun.
- Treat every cell as rerunnable. Avoid hidden mutable state that changes behavior after repeated execution.

Good flow shape:

```python
@flow(name="OpenBayan Notebook Ollama Smoke Test")
def notebook_ollama_smoke_test() -> dict:
    logger = get_run_logger()

    environment = check_notebook_environment()
    packages = check_python_packages()
    models = list_ollama_models()
    embedding = generate_ollama_embedding()

    summary = {
        "python": environment["python"],
        "ollama_model_count": len(models),
        "ollama_embedding_dimensions": embedding["dimensions"],
    }

    logger.info("Notebook smoke test summary: %s", summary)
    return summary
```

Final execution cell:

```python
result = notebook_ollama_smoke_test()
result
```

## 6. Working With Ollama

OpenBayan assumes Ollama may run outside the Docker Compose stack, often on another machine with better GPU resources.

Set this in `OpenBayanBackend/.env`:

```dotenv
OLLAMA_URL=http://<ollama-host-ip>:11434
OLLAMA_EMBED_MODEL=mxbai-embed-large:latest
```

Then restart the notebook service:

```bash
cd OpenBayanBackend
docker compose up -d jupyter
```

Notebook checks should call lightweight endpoints first:

```text
GET /api/tags
POST /api/embeddings
```

For smoke tests, return only metadata such as model name, embedding dimensions, and the first few values. Do not print full embeddings into notebook output.

## 7. Data and Output Hygiene

Keep notebooks reviewable in Git.

Recommended practices:

- Clear large outputs before committing.
- Do not store secrets, tokens, API responses with private data, or full embeddings in cell output.
- Keep exploratory scratch notebooks out of committed paths unless they are intentionally documented.
- Prefer deterministic sample inputs, especially for Arabic text examples.
- Use short Arabic examples for morphology or embedding checks.
- Keep generated files under explicit output folders if the notebook creates artifacts.

For notebooks that may write to SurrealDB, include a visible "dry run" mode or write to test records that are easy to identify and delete.

## 8. Promoting Notebook Code

Use notebooks for exploration and smoke testing. Move stable logic into Python modules when it becomes part of the application pipeline.

Promotion path:

```text
Notebook cell
  -> small helper function
  -> Prefect @task in a Python module
  -> Prefect @flow
  -> worker deployment
```

Good candidates to promote:

- SurrealDB connection helpers
- Arabic text cleaning and segmentation
- embedding generation
- Ollama request helpers
- reusable validation checks
- ingestion tasks used by more than one notebook

Keep the notebook as a thin orchestration and inspection layer after promotion:

```python
from tasks.ollama import generate_embedding
from tasks.validation import check_runtime
```

## 9. Container Commands

Use Docker for all notebook development commands.

```bash
# Start notebook dependencies
cd OpenBayanBackend
docker compose up -d jupyter prefect-server surrealdb

# Rebuild after dependency changes
docker compose build jupyter data-worker
docker compose up -d jupyter data-worker

# Check service status
docker compose ps

# Follow notebook logs
docker logs bayan_jupyter -f

# Follow Prefect logs
docker logs bayan_prefect -f
```

If a notebook needs shell execution, run commands inside the container:

```bash
docker exec -it bayan_jupyter bash
```

## 10. Validation Checklist

Before treating a notebook as integrated:

- The notebook is saved under `OpenBayanBackend/notebooks/`.
- The backend stack starts with Docker Compose.
- Jupyter opens at `http://localhost:8888`.
- The kernel starts without manual package installation.
- `PREFECT_API_URL` is visible from the notebook.
- Required external URLs such as `OLLAMA_URL` are set.
- The notebook runs top-to-bottom after restarting the kernel.
- The final cell returns a compact summary.
- Prefect flow runs appear in `http://localhost:4200` when the notebook uses `@flow`.
- Outputs are small enough for code review.
- No secrets or large embeddings are committed.

## 11. Common Issues

| Symptom | Likely cause | Fix |
|:---|:---|:---|
| `ModuleNotFoundError` in Jupyter | Package was installed on host or missing from image | Add it to `worker/requirements.txt`, rebuild `jupyter`, and restart the service. |
| `PREFECT_API_URL` is empty | Notebook was run outside Docker or Compose env is missing | Start Jupyter with `docker compose up -d jupyter prefect-server`. |
| Ollama connection timeout | `OLLAMA_URL` points to an unreachable host from inside Docker | Use an IP or hostname reachable from the container and restart Jupyter. |
| CAMeL data missing | Worker image was not rebuilt after Dockerfile changes | Run `docker compose build jupyter data-worker`. |
| Flow does not appear in Prefect UI | Prefect server is not running or API URL is wrong | Check `docker compose ps`, `docker logs bayan_prefect -f`, and `PREFECT_API_URL`. |
| Notebook works once but fails after rerun | Cells depend on hidden execution order | Restart kernel and run all cells; move setup into explicit early cells. |

## 12. Authoring Template

Use this lightweight template for new integration notebooks:

```markdown
# OpenBayan <Integration Name>

Purpose:
- Verify ...
- Produce ...

Requires:
- Docker Compose service: ...
- External service: ...

Expected result:
- ...
```

```python
from pathlib import Path
import os

from prefect import flow, get_run_logger, task

NOTEBOOK_ROOT = Path.cwd()
PREFECT_API_URL = os.environ.get("PREFECT_API_URL")
```

```python
@task(name="Check Runtime")
def check_runtime() -> dict:
    return {
        "cwd": str(NOTEBOOK_ROOT),
        "prefect_api_url": PREFECT_API_URL,
    }
```

```python
@flow(name="OpenBayan <Integration Name>")
def run_integration_check() -> dict:
    logger = get_run_logger()
    runtime = check_runtime()
    logger.info("Runtime summary: %s", runtime)
    return runtime
```

```python
result = run_integration_check()
result
```
