# OpenBayan-KG Project Rules

## Development Standards

- **Language Preference:** Always prioritize Python for backend, data processing, and AI-related tasks.
- **Workflow Orchestration:** 
    - All data ingestion, enrichment, and processing logic must be structured as **Prefect tasks and flows**.
    - Jupyter Notebooks used for development should be designed as modular components that can be easily converted or executed as Prefect tasks.
    - Use the established `bayan-ingestion-pool` for all data-related background workers.

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

## Directory Conventions

- `OpenBayanBackend/notebooks/flows/`: Permanent Prefect flows.
- `OpenBayanBackend/notebooks/tasks/`: Reusable task helpers.
- `OpenBayanBackend/notebooks/experiments/`: Temporary research notebooks.
