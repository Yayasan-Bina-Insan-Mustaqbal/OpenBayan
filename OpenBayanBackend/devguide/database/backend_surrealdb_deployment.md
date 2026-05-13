# SurrealDB Deployment & Worker Boundaries

OpenBayan's backend runtime is SurrealDB plus background workers. There is no separate Python HTTP gateway in the target architecture.

## 1. Runtime Services

| Service | Purpose | Typical Container |
|:---|:---|:---|
| SurrealDB | Application database, auth, permissions, graph, full-text search, vector search | `bayan_surrealdb` |
| Next.js | Web UI, route handlers, server actions, NextAuth session handling | `bayan_frontend` |
| Prefect Server | Flow orchestration and run history | `bayan_prefect` |
| Python Worker | Heavy NLP, embeddings, ingestion, graph enrichment | `bayan_worker` |
| Jupyter | Local research and pipeline experiments | `bayan_jupyter` |

SurrealDB is the authority for application data. Next.js should stay thin: validate request shape, read the session, call SurrealDB, and render.

## 2. Why No API Gateway

SurrealDB already provides the pieces OpenBayan needed a gateway for:

- record access for signup/signin
- JWT-like record tokens
- table and row permissions using `$auth`
- SQL-over-HTTP and WebSocket RPC
- graph relations with `RELATE`
- full-text and vector indexes

Keep Python for the work that actually needs Python: NLP models, embeddings, long-running ingestion, and scheduled enrichment.

## 3. Compose Shape

The backend compose file should stay focused on data services:

```yaml
services:
  surrealdb:
    image: surrealdb/surrealdb:latest
    container_name: bayan_surrealdb
    command: start --log trace --user root --pass root surrealkv:/data/database.db
    ports:
      - "8000:8000"
    volumes:
      - surreal_data:/data

  prefect-server:
    image: prefecthq/prefect:3-python3.12
    container_name: bayan_prefect
    ports:
      - "4200:4200"

  data-worker:
    build:
      context: ./worker
    container_name: bayan_worker
    environment:
      - SURREAL_WS_URL=ws://surrealdb:8000/rpc
      - SURREAL_USER=${SURREAL_USER}
      - SURREAL_PASS=${SURREAL_PASS}
      - PREFECT_API_URL=http://prefect-server:4200/api
    depends_on:
      - surrealdb
      - prefect-server
```

## 4. Scaling Rules

Scale the layer that owns the bottleneck:

| Bottleneck | Scale This | Notes |
|:---|:---|:---|
| Web rendering or route handlers | Next.js containers | Route handlers should remain light and mostly I/O-bound. |
| Long ingestion jobs | Python workers | Add workers to the same Prefect work pool. |
| Embedding throughput | Worker CPU/GPU resources | Prefer batching and model reuse inside the worker. |
| Database latency | SurrealDB resources and indexes | Add indexes before adding application cache. |

For local development, use Docker Compose commands only. Do not run development servers directly on the host.

## 5. Security Checklist

- Replace `root/root` outside local development.
- Keep root credentials only in backend container environments.
- Use SurrealDB record access for user login.
- Put ownership checks in `PERMISSIONS`, not only in application code.
- Keep private SurrealDB tokens in server-side NextAuth sessions.
- Expose SurrealDB publicly only behind TLS and network restrictions.

