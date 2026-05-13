# OpenBayan Ingestion Expansion Plan (Phase 2)

This plan outlines the systematic ingestion of 11 newly identified datasets into the OpenBayan Knowledge Graph.

## 1. Prioritization & Phasing

### **Phase 2.1: Thematic & Emotional Enrichment (Research Plane)**
*   **Dataset**: `nabeelqureshitiii/quranic-thematic-and-emotional-annotation-dataset` (Kaggle)
*   **Goal**: Enable search by emotion (Fear, Hope, Awe) and high-level themes.
*   **Schema Mapping**:
    - `Emotion` -> `ayah.metadata.emotion`
    - `Thematic Group` -> `category:theme` nodes + `RELATE ayah->classified_as->category`

### **Phase 2.2: Massive Multi-Tafsir Ingestion (Library Plane)**
*   **Datasets**: `Mrking1/Quran-Tafseer`, `MohamedRashad/Quran-Tafseer`, `riotu-lab/Quran-Tafseers`
*   **Goal**: Add 84+ classical Arabic tafsirs.
*   **Schema Mapping**:
    - `text` -> `ayah.tafsir.{tafseer_slug}`
    - Create `source` records for each Tafsir author/edition.

### **Phase 2.3: Parallel Translation & Hadith (Library/Hadith Plane)**
*   **Datasets**: `ImruQays` (17 translations), `gurgutan/sunnah_ar_en_dataset`
*   **Goal**: Complete English scholarly coverage and expand Hadith collections (Musnad Ahmad).

### **Phase 2.4: Domain-Specific RAG & Research Corpus**
*   **Datasets**: `omaressam1111/multi-tafseer-quran-rag`, `riotu-lab/Arabic-books-and-research-dataset`
*   **Goal**: Ingest academic research into the `book` and `sentence` tables for advanced RAG.

## 2. Technical Workflow

1.  **Preparation**:
    - Use `huggingface_hub` to download Parquet/CSV files directly into the `OpenBayanBackend/data` directory.
    - Standardize Surah/Ayah mapping (some datasets use `surah_id`, others `chapter`).
2.  **Prefect Flow Development**:
    - Create `OpenBayanBackend/notebooks/flows/ingest_hf_tafsir.py` (Generic multi-source tafsir flow).
    - Create `OpenBayanBackend/notebooks/flows/ingest_thematic_annotations.py`.
3.  **SurrealDB Optimization**:
    - Use `UPDATE ... MERGE` for metadata to prevent overwriting existing fields.
    - Batch relationships (`RELATE`) to maintain performance.

## 3. Next Steps

- [ ] Initialize `huggingface_hub` and `kaggle` CLI on the devserver.
- [ ] Create the pilot flow for **Thematic & Emotional Annotations**.
- [ ] Verify Surah mapping for `ImruQays` parallel texts.
