# Plan 08: Ingesting Tafsir

## Objective
Process Tafsir (exegesis) works and link them to the Quranic Ayahs and supporting Hadiths.

## Proposed Workflow
1. **Source Processing**:
    - Digitized Tafsir content (e.g., from Shamela).
    - Mapping content to specific `ayah` IDs.
2. **Atomic Units**:
    - Breakdown Tafsir passages into the `sentence` table.
3. **Cross-Linking**:
    - **Tafsir -> Ayah**: Direct relationship to the verse being explained.
    - **Tafsir -> Hadith**: Link citations within the Tafsir text to relevant `hadith` records.
    - **Tafsir -> Sentence**: Mapping to the atomic knowledge units.
4. **Implementation**: Prefect flow to orchestrate structural parsing and relation creation in SurrealDB.

## Success Criteria
- Tafsir content is searchable via linked Ayahs and Hadiths.
- High-fidelity graph edges connecting exegesis to primary sources.
