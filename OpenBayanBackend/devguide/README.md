# OpenBayan Developer Guide

Welcome to the OpenBayan developer documentation. This directory contains detailed guides on the architecture, integration patterns, and best practices used in the project.

## Available Guides

### 🏗️ Architecture & Setup
- [Local Development Setup](architecture/local_dev_setup.md) — Step-by-step guide to run the full stack locally using Docker.
- [Next.js Installation & Configuration](architecture/frontend_nextjs_installation.md) — Bootstrapping Next.js, Dockerizing, and connecting to SurrealDB.
- [Hybrid Web & Desktop IDE Architecture](architecture/frontend_hybrid_ide_architecture.md) — Deep dive into the Omni-Storage IDE strategy.

### 🖥️ Workspace (IDE Workspace)
- [Workspace Redesign Vision](workspace/workspace_redesign.md) — Overview of the VS Code-inspired research environment.
- [Detailed Workspace Plan](workspace/workspace_redesign_vscode_workspace.md) — Technical spec for split panes, tabs, and active pane logic.
- [Workspace Todo](workspace/workspace_todo.md) — Current implementation checklist and priorities.

### 💾 Database & Backend
- [Master Database Reference](database/DATABASE.md) — Unified schema for Library, Taxonomy, and Research planes.
- [Semantic Search Strategy](database/strategies/SEARCH_STRATEGY.md) — Hybrid Search, RRF, and optimization.
- [Research Workspace Strategy](database/strategies/RESEARCH_WORKSPACE_STRATEGY.md) — File system, folders, and sharing architecture.
- [SurrealDB Auth Guide](database/auth.md) — NextAuth integration and record access.
- [Hybrid Vector Search (Legacy)](database/backend_surrealdb_hybrid_search.md) — Earlier BM25 + vector search notes.
- [NextAuth Integration](database/backend_surrealdb_nextauth_integration.md) — Session management with SurrealDB.
- [Deployment & Worker Boundaries](database/backend_surrealdb_deployment.md) — Service boundaries for the full stack.
- [Default Development Accounts](database/default_accounts.md) — Default credentials for seeded users.

### 🧠 AI & Knowledge Graph
- [Data Pipeline: Prefect Flows](ai-knowledge/data_pipeline_prefect_flows.md) — Orchestrating Arabic text ingestion and embedding generation.
- [Pydantic AI for KG](ai-knowledge/pydantic_ai_knowledge_graph.md) — Typed knowledge graph extraction patterns.
- [Ollama Quran Chunk Benchmark](ai-knowledge/ollama_quran_chunk_benchmark.md) — Benchmarking embedding strategies for Quranic text.
- [Jupyter Integration Best Practices](ai-knowledge/jupyter_notebook_integration_best_practices.md) — Structuring notebooks for AI research.

### ⚡ Performance & Testing
- [Performance Optimization](performance-testing/performance_optimization.md) — Strategies for frontend and backend speed.
- [Playwright & Lighthouse Setup](performance-testing/playwright_lighthouse_setup.md) — Automated testing and performance auditing.

### 🚀 Roadmap & Ideas
- [Book Uploading & Public Sharing](ideas/book_uploading_public_sharing.md) — (Planned) Handling PDF/EPUB binaries using SurrealDB native file types.
- [Book Verification & Text Integrity](ideas/book_verification_integrity.md) — (Planned) Ensuring text authenticity via algorithmic and community verification.

### 📁 Archive
- [Old vs New Code Comparison](archive/old_new_code_comparison.md) — Guide for porting legacy Laravel features.
- [Old Code](archive/oldCode/) — Legacy PHP implementation reference.

---

## Architecture at a Glance

```
[OpenBayan]
    │
    ├── openbayan/             ← Next.js + Tailwind + Lucide
    │   └── Uses NextAuth + server routes to query SurrealDB
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
| **4200** | Prefect UI | AI pipeline monitoring workspace |
