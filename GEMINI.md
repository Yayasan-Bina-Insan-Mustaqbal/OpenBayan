# OpenBayan-KG Project Rules

## Development Standards

- **Language Preference:** Always prioritize Python for backend, data processing, and AI-related tasks.
- **Workflow Orchestration:** 
    - All data ingestion, enrichment, and processing logic must be structured as **Prefect tasks and flows**.
    - Jupyter Notebooks used for development should be designed as modular components that can be easily converted or executed as Prefect tasks.
    - Use the established `bayan-ingestion-pool` for all data-related background workers.

## Architecture

- **Database:** SurrealDB is the primary source of truth for JSON documents, Graph relations, and Vector embeddings.
- **Backend Stack:** Prefect (Orchestration) + SurrealDB (Database) + Ollama (AI/Embeddings).
- **Frontend:** Next.js (located in `/openbayan`).

## Directory Conventions

- `OpenBayanBackend/notebooks/flows/`: Permanent Prefect flows.
- `OpenBayanBackend/notebooks/tasks/`: Reusable task helpers.
- `OpenBayanBackend/notebooks/experiments/`: Temporary research notebooks.
