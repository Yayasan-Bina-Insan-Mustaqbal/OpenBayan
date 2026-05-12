# Plan 06: Ingesting Quran

## Objective
Ingest the canonical Quranic text into the `ayah` table within the Library Plane.

## Proposed Workflow
1. **Source Extraction**: Use `bulk_scrape_quran.py` or existing datasets to fetch Arabic text and standard metadata (Surah, Ayah number, Juz).
2. **Database Ingestion**:
    - Table: `ayah`
    - Logic: Ensure each verse is unique and correctly mapped to its Surah.
3. **Chunking**: Verify if verses need further chunking into the `sentence` table for atomic search.
4. **Embedding**: Generate embeddings using Ollama (e.g., `nomic-embed-text`) for semantic retrieval.
5. **Prefect Orchestration**: Implement as a flow in `OpenBayanBackend/notebooks/flows/quran_ingestion.py`.

## Success Criteria
- All 6236 verses are present in the `ayah` table.
- Embeddings are generated for all verses.
