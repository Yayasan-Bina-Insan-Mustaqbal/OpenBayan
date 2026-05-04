# OpenBayan-KG Project TODO

## 🎯 High Priority
- [ ] **Verbatim Transliteration Alignment**: Update `enrich_and_chunk_ayah` prompt to ensure LLM chunks are verbatim subsets of the original source text to prevent hallucinations/omissions.
- [ ] **Harakat Stripping Utility**: Implement a robust Python helper to generate `simple_clean_text` (stripping Tashkeel/Harakat) for the `sentence` table.

## 🏗️ Infrastructure & Migration
- [x] **Database Migration**: Move SurrealDB to external LXC container (`192.168.100.33`).
- [x] **Schema Optimization**: Normalize `sentence` table (nested transliterations, removed `llm_context`).
- [x] **Service Configuration**: Update Backend and Frontend connection strings.

## 📥 Data Ingestion
- [ ] **Quran Re-ingestion**: Trigger the fresh ingestion flow with the new schema.
- [ ] **Linguistic Augmentation**: Re-run the Fawaz Ahmed API augmentation for the new namespace.
- [ ] **Hadith Integration**: Plan schema for Hadith-based `sentence` records.

## 🏗️ Future Integration (Turath & Hadith)
- [ ] **Hadith Schema Strategy**: Design specific metadata for Hadith (Isnad, Matn, Sanad grades) within the `sentence` structure.
- [ ] **Dynamic Ingestion**: Update logic to handle non-vocalized (no-tashkeel) text as the primary source for non-Quranic works.
- [ ] **Source Attribution**: Map a taxonomy for classical Islamic books and authors in the `entity` table.
