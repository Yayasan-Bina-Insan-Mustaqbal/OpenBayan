# Plan 09: Ingesting Tafsir

## Status
- **Source Selection**: ✅ Al Quran Cloud API (141 text editions)
- **Active Run**: 🟢 `axiomatic-leech` (PID 287)
- **Start Time**: 2026-05-13 01:47 PM
- **Estimated Completion**: ~03:21 PM (94 mins total duration)
- **Coverage**: Includes 6 major Arabic Tafsirs and 100+ global translations.

## Script Design (`ingest_quran_editions.py`)
The ingestion uses an optimized batch-update strategy to minimize API calls and database overhead:
1. **Discovery**: Fetches all identifiers from `/v1/edition/format/text`.
2. **Download**: Retrieves the full Quran text for each edition via `/v1/quran/{identifier}` (one request per edition).
3. **Optimized Ingestion**:
    - Processes data Surah-by-Surah.
    - Constructs multi-statement SQL `UPDATE` blocks for all 114 Surahs.
    - Performs atomic `UPSERT` into the `ayah` table.
4. **Data Structure**: Appends text into categorized object fields:
    - `tafsir.{identifier}`
    - `translations.{identifier}`
    - `transliterations.{identifier}`

## Roadmap
- [x] Identify API sources for "all text".
- [x] Build multi-edition ingestion flow.
- [x] Complete download of 141 editions.
- [x] Integrated Indonesian Tafsir (Tahlili/Wajiz) from **TafsirWeb**.
- [ ] Link Tafsir chunks to `sentence` table for graph search.

## Success Criteria
- [ ] 141 Editions processed and linked to 6,236 Ayahs.
- [ ] Integrated view (Ayah + Tafsir + Hadith) available via Knowledge Graph queries.


