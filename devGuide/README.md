# OpenBayan Developer Guide

Welcome to the OpenBayan developer documentation. This directory contains detailed guides on the architecture, integration patterns, and best practices used in the project.

## Available Guides

### 🚀 Getting Started
- [Local Development Setup](local_dev_setup.md) — Step-by-step guide to run the full stack locally using Docker. Covers environment variables, schema initialization, and common troubleshooting.
- [Old Code vs New Code: Porting and Duplication Guide](old_new_code_comparison.md) — Compares the legacy Laravel implementation in `oldCode` with the new React/FastAPI/SurrealDB direction and identifies what should be duplicated or rewritten.

### 🗄️ Database
- [SurrealDB Schema & Knowledge Graph](database_surrealdb_schema.md) — Full SurrealQL table definitions, row-level permissions, and graph relation design for the Sahifah, Faidah, Majmu, and Alamah entities.
- [Hybrid Vector Search](backend_surrealdb_hybrid_search.md) — Implementing BM25 + semantic vector search with Reciprocal Rank Fusion (RRF) for Arabic Islamic text discovery.

### ⚙️ Backend
- [FastAPI & NextAuth: OAuth2 Scopes Integration](backend_fastapi_nextauth_integration.md) — How to secure your backend using NextAuth JWTs and FastAPI scopes.
- [FastAPI Production Deployment: Server Workers](backend_fastapi_deployment_workers.md) — Understanding the difference between Server and Background workers and optimizing parallel performance.
- [Data Pipeline: Prefect Flows & Arabic NLP](data_pipeline_prefect_flows.md) — The AI Factory: orchestrating Arabic text ingestion, SpaCy segmentation, CamelBERT embedding generation, and SurrealDB graph creation with Prefect.

### 💻 Frontend
- [Next.js Installation & Configuration](frontend_nextjs_installation.md) — Comprehensive guide to bootstrapping Next.js, Dockerizing with Standalone mode, and connecting to FastAPI.
- [Hybrid Web & Desktop IDE Architecture](frontend_hybrid_ide_architecture.md) — Deep dive into the Omni-Storage IDE strategy using React, FastAPI, SurrealDB, and Tauri.

---

## Architecture at a Glance

```
[OpenBayan]
    │
    ├── frontend/              ← Next.js + Tailwind + Lucide
    │   └── Connects to FastAPI (INTERNAL_API_URL & NEXT_PUBLIC_API_URL)
    │
    └── OpenBayanBackend/      ← Docker Compose Stack
        ├── SurrealDB          ← Multi-model DB (Graph + Vector + Document)
        ├── Prefect Server     ← AI pipeline orchestration
        └── Python Worker      ← SpaCy + CamelBERT + Prefect agent
```

| Port | Service | Description |
|:---|:---|:---|
| **3000** | Next.js Frontend | Scholar UI (Auth, BlockNote, Icons) |
| **8000** | SurrealDB | Database (WebSocket + HTTP REST) |
| **4200** | Prefect UI | AI pipeline monitoring dashboard |
