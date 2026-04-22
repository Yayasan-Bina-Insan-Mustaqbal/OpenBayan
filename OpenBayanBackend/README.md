# OpenBayan Backend Stack

This folder contains the core infrastructure for the OpenBayan AI Factory and Knowledge Graph.

## 🚀 Quick Start

1. **Start the Stack**:

   ```bash
   docker compose up -d
   ```

2. **Apply Database Schema**:
   ```bash
   ./apply_schema.sh
   ```

## 🔗 Important Links

| Service               | URL                                            | Purpose                                         |
| :-------------------- | :--------------------------------------------- | :---------------------------------------------- |
| **Prefect Dashboard** | [http://localhost:4200](http://localhost:4200) | Monitor and manage AI ingestion pipelines.      |
| **SurrealDB API**     | [http://localhost:8000](http://localhost:8000) | The primary database endpoint for the frontend. |
| **Jupyter Lab**       | [http://localhost:8888](http://localhost:8888) | Interactive research and testing environment.   |

## 🛠 Services Overview

- **SurrealDB**: Multi-model database handling JSON, Graph relations, and Vector search.
- **Prefect Server**: Orchestration engine for scheduling AI workflows.
- **Data Worker**: Python environment that executes the AI pipelines (SpaCy, Transformers, etc.).
- **Jupyter Lab**: Browser notebook environment using the same Python image as the worker.

## 📂 Directory Structure

- `worker/`: Docker configuration for the AI worker.
- `notebooks/`: AI pipeline logic and Prefect flows.
- `schema/`: SurrealQL initialization scripts.

## Jupyter Lab

The `jupyter` service is enabled in `docker-compose.yml` and mounts `./notebooks` into `/app/notebooks`.

```bash
docker compose up -d jupyter
```

Open [http://localhost:8888](http://localhost:8888). Token and password checks are disabled for local development only.

## Jupyter to Prefect Dev Loop

Use `notebooks/experiments/` for scratch notebooks, `notebooks/tasks/` for reusable task helpers, and `notebooks/flows/` for Prefect flows.

```text
notebooks/
├── experiments/
│   └── scratch.ipynb
├── flows/
│   └── my_flow.py
└── tasks/
    └── enrich.py
```

Run the sample flow directly:

```bash
docker compose exec jupyter python /app/notebooks/flows/my_flow.py
```

Run the Prefect-integrated notebook smoke test:

```bash
docker compose exec jupyter sh -lc \
  'cd /app/notebooks && /opt/conda/envs/prefect/bin/jupyter nbconvert --to notebook --execute --inplace jupyter_ollama_smoke_test.ipynb'
```

Deploy it to the local Prefect work pool:

```bash
docker compose exec jupyter prefect deploy /app/notebooks/flows/my_flow.py:my_flow \
  --name dev \
  --pool bayan-ingestion-pool
```

Trigger the deployment:

```bash
docker compose exec jupyter prefect deployment run "OpenBayan Dev Sample Flow/dev"
```

## External Ollama

If you have a separate Ollama machine, expose Ollama on that machine and set these values in `OpenBayanBackend/.env`:

```dotenv
OLLAMA_URL=http://<ollama-pc-ip>:11434
OLLAMA_EMBED_MODEL=mxbai-embed-large:latest
```

The `data-worker` and `jupyter` containers receive `OLLAMA_URL`, `OLLAMA_HOST`, and the configured model names automatically. This is useful for offloading model inference and embeddings at runtime. It does not replace installing Python libraries or CAMeL Tools data inside the worker image.
