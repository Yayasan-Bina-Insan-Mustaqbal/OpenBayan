# Plan 07: Ingesting Hadith

## Objective
Ingest Hadith collections and establish relationships with the `sentence` and `rijal` (narrators) tables.

## Proposed Workflow
1. **Source Ingestion**:
    - Process classical collections (Bukhari, Muslim, etc.).
    - Table: `hadith` (Library Plane).
2. **Entity Extraction**:
    - **Sentence Chunking**: Split Hadith text into atomic units in the `sentence` table.
    - **Rijal Mapping**: Extract narrator names from the Isnad and link to the `rijal` table.
3. **Graph Connections**:
    - Create edges between `hadith` and `sentence`.
    - Create edges between `hadith` and `rijal` (e.g., `hadith->narrated_by->rijal`).
4. **Prefect Task**: Use `bayan-ingestion-pool` for concurrent extraction and linking.

## Current Progress (2026-05-14)
- **Total Hadiths**: ✅ 88,690 records ingested.
- **Isnad Expansion**: ✅ Integrated the **HF Enhanced Sanadset** (650k+ potential links).
- **Narrator Connections**: ✅ 37,169+ relationships established in the Knowledge Graph.

## Success Criteria
- Hadith text stored in Library Plane.
- Automatic linkage to extracted narrators and atomic sentences.
