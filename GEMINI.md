# OpenBayan-KG Project Rules

## Development Standards

- **Language Preference:** Always prioritize Python for backend, data processing, and AI-related tasks.
- **Workflow Orchestration:** 
    - All data ingestion, enrichment, and processing logic must be structured as **Prefect tasks and flows**.
    - Jupyter Notebooks used for development should be designed as modular components that can be easily converted or executed as Prefect tasks.
    - Use the established `bayan-ingestion-pool` for all data-related background workers.
- **Execution Environment:** All production-grade ingestion and enrichment tasks MUST be executed on the **Devserver (`dockerdev` at 100.64.8.38)**. Local execution on `cachyos-abuhafi` is only if instructed and strictly for code prototyping and short verification runs.

## Database Table Intent

Rigorously adhere to the logical planes defined in `DATABASE.md`:

### Library Plane (Immutable Source Texts)
- **`source`**: Edition/Corpus metadata (Catalog of Books/Editions).
- **`ayah`**: Canonical Quranic Verses.
- **`hadith`**: Hadith Text.
- **`book`**: Metadata for classical books.
- **`book_section` / `book_page`**: Digitized content chunks/pages.
- **`sentence`**: The atomic knowledge unit. All searchable text should eventually be chunked into sentences.

### Research Plane (User-Generated Content - USER ONLY)
- **`user`**: Researcher accounts.
- **`sahifah`**: **USER ONLY.** Long-form markdown research articles written by users. NEVER save book pages or system content here.
- **`faidah`**: Research notes tied to a bookmark (`alamah`).
- **`majmu`**: Folders for organizing research artifacts.
- **`alamah`**: User bookmarks (graph edge).

> **Rule**: If it comes from a library/book, it belongs in the Library Plane. If it's created by a user, it belongs in the Research Plane.

## Architecture

- **Database:** SurrealDB is the primary source of truth.
    - **Namespace:** `openbayan` (Always use lowercase)
    - **Database Name:** `openbayan` (Always use lowercase)
- **Naming Convention:** All future developments, ingestions, and configurations must strictly use the `openbayan` namespace and database. Obsolete namespaces like `OpenBayan` or `main` have been removed.
- **Backend Stack:** Prefect (Orchestration) + SurrealDB (Database) + Ollama (AI/Embeddings).
- **Frontend:** Next.js (located in `/openbayan`).

## Frontend Deployment Standards

- **Production Host:** The production Next.js frontend is located on the remote Tailscale server (`docker-openbayan-fe` at `100.101.207.74`).
- **Production Port:** The application MUST always be deployed to and exposed on host port **`3000`** (serving at `http://100.101.207.74:3000`, publicly mapped to the production domain **`https://openbayan.insanmustaqbal.or.id`**).
- **Automated Deployment:** 
  - The AI agent MUST always build and launch the production application inside Docker containers using the production multi-stage `Dockerfile` and `docker-compose.prod.yml`.
  - Deployment is fully automated: the AI agent should trigger the `./deploy.sh` script or run `npm run deploy:prod` from the `openbayan` directory to archive, upload, and deploy the application via Tailscale using the password stored in `.env`.

## Directory Conventions

- `OpenBayanBackend/notebooks/flows/`: Permanent Prefect flows.
- `OpenBayanBackend/notebooks/tasks/`: Reusable task helpers.
- `OpenBayanBackend/notebooks/experiments/`: Temporary research notebooks.
