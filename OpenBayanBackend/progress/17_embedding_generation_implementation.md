# 17. Embedding Generation Implementation Plan

This document tracks the implementation and evaluation of various embedding generation strategies (Wasm, Edge, SurrealML) for OpenBayan's search system.

## 🎯 Objectives
- Benchmark embedding generation speed for user queries.
- Evaluate the trade-off between client-side download (~22MB) and server-side compute.
- Implement a fallback mechanism for search if the local model fails to load.
- Consolidate embedding logic to ensure consistency across the UI and backend pipelines.

## 📅 Timeline & Tasks

### Phase 1: Prototype Client-Side Wasm
- [ ] Integrate `Transformers.js` into the Next.js search component.
- [ ] Implement model caching using the browser's Cache API.
- [ ] Test inference speed on various mobile and desktop devices.

### Phase 2: Explore SurrealML
- [ ] Convert `all-MiniLM-L6-v2` to `.surml` format.
- [ ] Upload the model to the `openbayan` SurrealDB instance on the devserver.
- [ ] Benchmark `ml::` function performance compared to client-side inference.

### Phase 3: Hybrid Implementation
- [ ] Implement a unified "Search Service" in the backend.
- [ ] Configure the frontend to prefer Client Wasm (for cost savings) but fallback to a server-side route if needed.
- [ ] Finalize the SurrealQL RRF search query to utilize the generated vectors.

## 📊 Status Summary
- **Current Phase**: Planning
- **Last Updated**: 2026-05-13
- **Completed Tasks**: 0 / 9

## 📝 Notes
- `all-MiniLM-L6-v2` is the preferred model for its balance of performance and size (~22MB).
- Ensure the embeddings generated in the search UI match the dimensionality (e.g., 384 for MiniLM) used in the ingestion pipeline (or implement a mapping).
- *Cross-Reference*: See [DATABASE.md](../devguide/database/DATABASE.md) for current index definitions.
