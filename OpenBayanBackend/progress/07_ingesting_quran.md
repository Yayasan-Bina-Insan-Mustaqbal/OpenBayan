# Plan 07: Ingesting Quran (Multi-Modal & Semantic)

## Status
- **Raw Ingestion**: ✅ Complete (6,236 Ayahs in `ayah` table)
- **Semantic Chunking**: 🟡 In Progress (Awaiting LLM flow execution)
- **Multi-Modal Embeddings**: 🟡 Pending

## Objective
Ingest the canonical Quranic text and create enriched, searchable semantic chunks within the Library Plane.

## Semantic Chunking & Embedding Flow (`ingest_quran.py`)
This phase transforms the raw Ayahs into searchable, semantically-rich "atomic knowledge units" in the `sentence` table.

1. **Context-Aware Processing**:
   - Instead of processing Ayahs in isolation, the script fetches the full **Hizb Quarter** as context.
   - This ensures the LLM understands the surrounding narrative/topic before splitting.

2. **LLM Enrichment (`qwen2.5:7b`)**:
   - **Semantic Splitting**: Ayahs are split into chunks based on semantic completion and Quranic *waqf* (stop) marks.
   - **Zero-Shot Classification**: Each chunk is tagged with taxonomy labels from the `category` table (level 2+).
   - **Entity Extraction**: Identifying Prophets, geographical locations, and legal concepts.

3. **Multi-Modal Vectorization (`mxbai-embed-large`)**:
   - **Text Vector**: Embedding the original Arabic chunk for semantic retrieval.
   - **Sound Vector**: Embedding the English transliteration to support **"Search-by-Sound"** (e.g., finding a verse by typing how it sounds).

4. **Graph Relationship Building**:
   - **Importance Weighting**: `importance` (1-10) is assigned by the LLM. 
   - **Manual Boosting**: Logic specifically boosts foundational verses (Al-Fatiha +1, Ayat al-Kursi +2).
   - **Entity Linkage**: Automatic `UPSERT` into the `entity` table and creation of `mentions` edges.


## Roadmap & Next Phases
- **Plan 08**: [Ingesting Hadith](08_ingesting_hadis.md) - ✅ 50,884 records currently in database.
- **Plan 09**: [Ingesting Tafsir](09_ingesting_tafsir.md) - ❌ Not yet downloaded.

## Success Criteria
- [x] 6,236 Verses processed.
- [ ] ~15,000+ Semantic sentences (chunks) generated and embedded.
- [ ] All detected entities linked to the `entity` table.
- [ ] Hybrid search (Text + Vector) validated on Quranic data.


