# Old Code vs New Code: Porting and Duplication Guide

This guide compares the current OpenBayan implementation with the legacy code linked at `devGuide/oldCode/IslamResearch`. Use it as a migration checklist when deciding what old behavior can be duplicated, what should be redesigned for the new stack, and what should be left behind.

## 1. Snapshot

| Area | New Code | Old Code | Migration Read |
|:---|:---|:---|:---|
| Application shell | `openbayan/` Next.js + React + TypeScript app | Laravel 13 + Livewire 4 + Blade + Filament | Rebuild UI behavior in React; do not copy Blade/Livewire components directly. |
| Backend gateway | No separate gateway; Next.js server routes talk to SurrealDB | Laravel controllers, services, jobs, policies, Horizon | Port contracts and workflow semantics into Next.js routes, SurrealQL, and Prefect jobs; leave Laravel framework code behind. |
| Database | SurrealDB schema guide for `researcher`, `sahifah`, `faidah`, `majmu`, `category`, graph edges | PostgreSQL migrations for sentences, source books, translations, lexicon, tags, entities, notebooks, personalization | Duplicate domain concepts, not table structure. Map relational joins to SurrealDB records and `RELATE` edges. |
| Search | Guide-level SurrealDB BM25 + vector RRF design | Implemented Laravel `SearchService`, `QueryParser`, Meilisearch, pgvector, reranker API, personalization filters | Strong duplication candidate at behavior/API shape level. Rewrite query layer for SurrealQL. |
| Data pipeline | Docker worker with Prefect server and placeholder worker image | Prefect flows under `ai-scripts/`, Ollama embeddings, CAMeL roots, classification, translation, transliteration, KG enrichment | Highest direct-reuse candidate. Python task logic can be moved with database adapter changes. |
| Auth | SurrealDB record access + NextAuth session storage | Quran Foundation OAuth controller, Laravel session auth, Filament login | Reuse Quran OAuth provider details and role mapping, not session/controller code. |
| Admin/ops | Prefect UI and SurrealDB admin workflows | Filament resources, Telescope, Horizon, Pest/Dusk tests | Keep monitoring ideas; new stack needs React, Prefect, and SurrealDB alternatives. |

## 2. What the New Code Actually Contains

The current repository is intentionally small:

- `OpenBayanBackend/docker-compose.yml` runs SurrealDB, Prefect Server, and a Python worker.
- `OpenBayanBackend/worker/Dockerfile` installs `surrealdb`, `transformers`, `spacy`, and `camel-tools`.
- `openbayan/` contains the Next.js app, Auth routes, and SurrealDB auth helper.
- `devGuide/` defines the intended architecture: NextAuth + SurrealDB record access, SurrealDB graph schema, hybrid search, Prefect ingestion, and a future React/Tauri research IDE.

This means old-code migration should prioritize reusable domain behavior and pipeline code before UI polish.

## 3. What the Old Code Contains

The legacy project is a feature-rich Laravel application:

- Domain models: `Sentence`, `SourceBook`, `Scholar`, `Taxonomy`, `LexiconRoot`, `LexiconWord`, `Entity`, `EntityRelationship`, `UserNotebook`, `UserWorkspace`, `Collection`, `UserFeedback`, `UserJourney`, `UserSearch`, `UserHabit`.
- Search API: `/api/search`, `/api/search/pipeline`, `/api/search/autocomplete`.
- Search behavior: query normalization, Arabic root extraction, entity matching, vector search, Scout/Meilisearch fallback, category clustering, semantic sliding-window reranking, entity hydration, root hydration, citation metadata.
- Pipeline: Prefect `Islamic Text Enrichment`, Quran flows, knowledge-graph enrichment, Ollama embeddings, translation, transliteration, CAMeL morphology, NER, taxonomy tagging.
- Auth: Quran Foundation OAuth redirect/callback and user role assignment.
- Admin/testing: Filament, Horizon, Telescope, Pest feature tests, Dusk/browser screenshots.
- Reference data: taxonomy markdown/json files under `reference/taxonomy/`.

## 4. Recommended Duplication Plan

### Duplicate Soon

These pieces map cleanly to the new architecture and have high product value.

| Old Code Source | Duplicate Into | Required Changes |
|:---|:---|:---|
| `ai-scripts/tasks/text_prep.py` | `OpenBayanBackend/notebooks/tasks/prep.py` | Keep Harakat stripping, manual verse delimiters, SpaCy sentence boundaries, CAMeL root extraction. Normalize function names to match `data_pipeline_prefect_flows.md`. |
| `ai-scripts/tasks/vectorize.py` | `OpenBayanBackend/notebooks/tasks/enrich.py` or `tasks/vectorize.py` | Keep Ollama embedding calls and 1024-dim validation. Replace returned keys with SurrealDB schema fields such as `embedding`. |
| `ai-scripts/openbayan_pipeline.py` | `OpenBayanBackend/notebooks/openbayan_pipeline.py` | Keep stage ordering: fetch job, classify, NER, tags, translation, transliteration, embeddings, persist, artifact. Replace Laravel database/webhook calls with SurrealDB writes and Prefect run status. |
| `ai-scripts/flows/knowledge_graph.py` | `OpenBayanBackend/notebooks/flows/knowledge_graph.py` | Keep recursion guardrails and enrichment cadence. Replace `entities`/`entity_relationships` relational writes with SurrealDB entity tables and `RELATE`. |
| `reference/taxonomy/main.json` and markdown taxonomy files | `OpenBayanBackend/reference/taxonomy/` or a seed flow | Keep as source taxonomy vocabulary for `category` tags/categories. Create an idempotent SurrealDB seed script. |
| `app/Services/QueryParser.php` behavior | SurrealDB lookup queries and optional worker utilities | Preserve query normalization, root lookup, and entity alias matching. |
| `app/Services/SearchService.php` response shape | Next.js `app/api/search` route and SurrealQL query modules | Preserve `/search/pipeline` structured response shape. Rewrite retrieval using SurrealDB BM25/vector queries. |
| `app/Http/Controllers/QuranAuthController.php` provider details | NextAuth provider config | Reuse OAuth endpoints, scopes, state validation concept, and role mapping. Do not port Laravel session code. |

### Duplicate Later

These are useful but depend on missing new-stack foundations.

| Old Code Source | Why Later |
|:---|:---|
| Livewire Scholar workspace and Blade views | The new frontend should be React/Zustand/Shadcn/Tauri-aware. Port layout concepts, not templates. |
| `UserWorkspace`, `UserJourney`, `UserNotebook`, `Collection` models | Needs final SurrealDB schema for notebook/workspace persistence. |
| `UserFeedback` and personalization filters | Valuable for search quality, but requires user identity, owner model, and feedback permissions. |
| Filament admin resources/widgets | New stack needs a React admin surface or Prefect/SurrealDB admin workflows. |
| Pest/Dusk test cases | Port scenarios after SurrealDB-backed route handlers and React UI exist. |

### Do Not Duplicate Directly

| Old Code | Reason |
|:---|:---|
| `vendor/`, `node_modules/`, `.git/`, `storage/framework/views/`, build artifacts | Generated dependencies/cache. |
| Laravel migrations as executable schema | New persistence target is SurrealDB, not PostgreSQL. Use migrations only as a data-model reference. |
| Laravel Horizon queue code | Prefect is the new worker orchestration layer. |
| Meilisearch/Scout-specific code | SurrealDB BM25 + vector search is the target. Keep behavior, not engine-specific APIs. |
| Blade/Livewire components | They do not fit the React/Tauri frontend architecture. |

## 5. Domain Model Mapping

The current SurrealDB schema is simpler than the legacy relational model. Before importing old behavior, decide whether to extend the schema or collapse old entities into existing records.

| Old Relational Concept | Current/New SurrealDB Concept | Recommended Mapping |
|:---|:---|:---|
| `users` | `researcher` | Direct rename. Preserve `role`, email uniqueness, OAuth identity metadata. |
| `source_books` | `sahifah` | Map source title/content/status/metadata into `sahifah`; add `resource_type`, `language`, and external source metadata if needed. |
| `sentences` | `faidah` | Treat each sentence/ayah/benefit as one `faidah`; keep `source_ref`, sequence, resource type, citations, and language metadata. |
| `sentence_translations` | `faidah.translation_*` fields or related records | If multiple translations are needed, add a `tarjamah` table related to `faidah`. |
| `sentence_transliterations` | `faidah.transliteration_*` fields or related records | Inline if one scheme; separate table if multiple schemes. |
| `lexicon_roots`, `lexicon_words`, `sentence_word` | New lexical tables plus graph edges | Add `jidhr` and `lafz` tables; relate `faidah -> uses_word -> lafz -> has_root -> jidhr`. |
| `taxonomies`, `tags` | `category` | Store taxonomy category, parent path, labels, translations, and source file. Use `tagged_with` edges. |
| `entities`, `entity_relationships`, `sentence_entity` | New entity tables and relation edges | Add `entity`; relate `faidah -> mentions -> entity` and `entity -> related_to -> entity`. |
| `collections`, `collection_items` | `majmu`, `contains` | Direct conceptual match. Use SurrealDB relations instead of polymorphic rows. |
| `user_notebooks`, `user_workspaces` | `sahifah` or new workspace tables | Use `sahifah` for notebook documents; add `workspace` if layout/tab state must be first-class. |
| `user_feedback`, `user_searches`, `user_journeys`, `user_habits` | New personalization tables | Add only after auth and search are implemented. |

## 6. Search Behavior to Preserve

The old `SearchService` is the clearest product specification for search. The new SurrealDB-backed search should preserve these output layers even if internal storage changes:

- `category_clusters`: grouped discovery by taxonomy/source path.
- `sentence_results`: ranked atomic text results with Arabic, translation, transliteration, citations, and sniped fragments.
- `entity_results`: matched and related knowledge-graph entities.
- `root_word_results`: roots and morphological forms found in the result set.
- `processing_time_ms`: useful for regression tracking.

Rewrite the implementation around SurrealDB:

1. Normalize Arabic query text and strip Harakat.
2. Extract roots/entities using SurrealDB lookups.
3. Embed the query using the same model used during ingestion.
4. Run BM25 and vector retrieval against `faidah`.
5. Fuse ranks with the RRF/scoring plan from `backend_surrealdb_hybrid_search.md`.
6. Hydrate graph edges with `FETCH` or follow-up graph traversals.
7. Apply the old micro-targeting/reranker behavior after retrieval.

## 7. Pipeline Behavior to Preserve

The old Prefect code should become the implementation behind the current pipeline guide. Preserve these stages:

1. Clean Arabic text, strip Harakat, and preserve verse/manual boundaries.
2. Extract CAMeL morphological root data.
3. Classify against scholarly taxonomy.
4. Extract named entities and thematic tags.
5. Translate only when requested.
6. Transliterate only when requested.
7. Generate Arabic-first embeddings and optional translation embeddings.
8. Persist text, embeddings, tags, lexical data, and graph edges in one transaction-like unit.
9. Emit Prefect artifacts and status updates.

Primary rewrite point: old pipeline reads/writes PostgreSQL through `database.py` and notifies Laravel. New pipeline should write SurrealDB directly. User-triggered work should create SurrealDB `ingestion_job` records that Prefect workers pick up.

## 8. Auth Behavior to Preserve

The old Quran Foundation OAuth flow is still useful as a reference:

- Authorization endpoint: `https://oauth2.quran.foundation/oauth2/auth`
- Token endpoint: `https://oauth2.quran.foundation/oauth2/token`
- UserInfo endpoint: `https://oauth2.quran.foundation/oidc/userinfo`
- Scope pattern: `openid profile email`
- Security behavior: generate and validate `state`
- User behavior: create or update user by email, assign default researcher role

In the new stack, implement this as a NextAuth provider if the frontend owns login. Store the resulting user identity in SurrealDB and keep row-level permissions in SurrealQL, as described in `backend_surrealdb_nextauth_integration.md`.

## 9. Suggested Migration Order

1. Finalize the SurrealDB schema and record access model.
2. Port old Python pipeline tasks first, replacing PostgreSQL/Laravel calls with SurrealDB helpers.
3. Extend `database_surrealdb_schema.md` for lexical roots, entities, translations, transliterations, source metadata, and personalization tables.
4. Seed old taxonomy reference files into `category`.
5. Implement SurrealDB-backed search with the old structured response contract.
6. Port Quran OAuth configuration into NextAuth and verify SurrealDB record permissions.
7. Build out the React Scholar IDE shell, using old UX docs as behavior references.
8. Port tests as API contract tests and pipeline unit tests.

## 10. Main Risk

The biggest migration risk is copying old relational assumptions into SurrealDB unchanged. The old code models many relationships with join tables and Eloquent relationships; the new architecture should express those links as records and graph relations. Treat the old code as the product and domain specification, while the new guides remain the architectural target.
