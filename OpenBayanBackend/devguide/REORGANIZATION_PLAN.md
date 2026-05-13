# Backend Code Reorganization Plan

## Objective
Standardize the directory structure of `OpenBayanBackend` to improve maintainability and separate production logic from research and diagnostic tools.

## 📁 Proposed Folder Hierarchy

### 1. `notebooks/flows/ingestion/`
*Core data ingestion pipelines (Prefect).*
- `ingest_quran.py`
- `ingest_quran_editions.py`
- `ingest_murad.py`
- `ingest_hadith_ahmedbaset.py`
- `ingest_al_baqarah.py`
- `ingest_athar_passages.py`

### 2. `notebooks/flows/scraping/`
*Scripts for external data acquisition.*
- `bulk_scrape_quran.py`
- `exhaustive_scrape.py`
- `ingest_shamela.py`
- `ingest_shamela_books.py`
- `ingest_shamela_catalog.py`
- `ingest_shamela_passages.py`

### 3. `notebooks/flows/enrichment/`
*AI/LLM-driven data augmentation.*
- `enrich_dictionary_data.py` (**ACTIVE - DO NOT MOVE YET**)
- `extract_ilm_al_rijal.py`
- `batch_dictionary_extraction.py`
- `fawaz_augmentation.py`

### 4. `notebooks/tasks/`
*Reusable task logic and utility scripts.*
- `utils.py`
- `ingest_and_embed.py`
- `seed_taxonomy.py`
- `seed_taxonomy_v2.py`
- `migrate_metadata.py`

### 5. `notebooks/diagnostics/`
*System monitoring and data validation.*
- `check_overall_progress.py`
- `check_extraction_progress.py`
- `check_rijal_pages.py`
- `db_stats.py`
- `verify_dictionary_data.py`
- `test_dictionary_extraction.py`
- `test_hybrid_search.py`
- `compare_embeddings.py`
- `compare_surreal.py`

### 6. `notebooks/benchmarks/`
*Performance testing and strategy evaluation.*
- `storm_benchmark.py`
- `summarize_benchmark.py`
- `benchmark_extraction_strategies.py`

### 7. `notebooks/experiments/` (Legacy/Archive)
*Retired or research-only scripts.*
- `graph_and_tag_research.py`
- `ingest_al_baqarah.py` (Old variants)

## 🛡 Execution Guard
> [!IMPORTANT]
> This plan will be executed **ONLY** after all active background runs (`axiomatic-leech` and `elfish-husky`) have completed successfully to avoid breaking Prefect file references.

## 🚀 Post-Move Cleanup
1. Delete all `.log` files in the root.
2. Delete `.json` benchmark results in the root.
3. Update internal imports in moved scripts.
