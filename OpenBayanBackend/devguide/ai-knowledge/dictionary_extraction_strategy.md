# Dictionary Extraction & Knowledge Graph Population Strategy

## Overview
This document outlines the pipeline for transforming raw classical dictionary texts from `book_page` records into a rich, interconnected linguistic Knowledge Graph. This strategy is designed to be applied to **all** foundational dictionaries currently being ingested, including:
- *Lisan al-Arab*
- *Maqayis al-Lugha*
- *Al-Qamus al-Muhit*
- *Al-Mufradat fi Gharib al-Quran*
- *Al-Sihah Taj al-Lugha*
- *Asas al-Balagha*

The process is divided into lexical extraction and entity enrichment.

## Phase 1: Lexical Extraction (Roots, Words, and Definitions)

### 1. Structural Parsing (Heuristics & Generalization)
Since we are processing a diverse set of dictionaries, the implicit structure must be parsed efficiently before LLM processing.
- **Challenge:** Each dictionary uses custom heading patterns to denote roots (e.g., *Lisan al-Arab* uses 'Bab' and 'Fasl', while *Al-Qamus al-Muhit* or *Al-Sihah* may use different organizational logic).
- **Action:** Implement a configurable Python parsing pipeline with regex/heuristics mapped to the specific structural style of each downloaded dictionary. This will chunk the raw `book_page` text into logical **Root Blocks** regardless of the source book.

### 2. LLM Extraction (Structured Output)
Pass each 'Root Block' to an LLM (via Ollama) using Pydantic to ensure structured JSON output.
- **Outputs to Extract:**
  - The base Arabic `root` (Jidhr).
  - A list of `derived_words`.
  - The specific `definition_chunk` explaining each word.

### 3. Graph Population (The Lexicon Layer)
- **Sentence Table:** Save the `definition_chunk` as a new `sentence` record. Its parent will be the original `book_page`.
- **Root Table:** Upsert the extracted root into the `root` table.
- **Word Table:** Upsert the extracted words into the `word` table, linking them to the `root`.
- **Linking:** Connect the definition to the word. 
  - *Schema Update Required:* Add a `defines` edge table (`IN sentence OUT word`) to explicitly state that the sentence serves as the definition for that word.

## Phase 2: Entity Extraction & Wikipedia Enrichment

### 1. Entity Recognition
Dictionary definitions often reference historical figures, poets, tribes, and locations to provide context.
- **Action:** Run a secondary LLM pass over the extracted `sentence` records to perform Named Entity Recognition (NER).
- **Target Entities:** People, Places, Tribes, Historical Events.

### 2. Wikipedia Enrichment
- **Action:** Utilize a Python Wikipedia plugin/library (e.g., `wikipedia-api` or `wikipedia`) to query the extracted entities.
- **Data to Fetch:** Summary, canonical title, and Wikipedia URL.

### 3. Graph Population (The Entity Layer)
- **Entity Table:** Upsert the recognized entity into the `entity` table, enriching it with the fetched Wikipedia URL and summary.
- **Linking:** 
  - Create a `mentions` edge: `IN sentence OUT entity`.
  - If a specific `word` directly represents an entity (e.g., a proper noun entry in the dictionary), link it via the existing `refers_to` field in the `word` schema.

## Required Schema Updates

To support this strategy, the following schema updates must be applied to SurrealDB:

```surrealql
-- Explicitly link a definition sentence to the word it defines
DEFINE TABLE defines SCHEMAFULL TYPE RELATION IN sentence OUT word ENFORCED;

-- Ensure the entity table has fields for Wikipedia enrichment (if not already present)
DEFINE FIELD wikipedia_url ON entity TYPE string;
DEFINE FIELD summary ON entity TYPE string;
```

## Implementation Plan

The development of the extraction logic will be split into two distinct Python scripts to ensure accuracy before scaling:

### 1. Prototype & Validation Script (`test_dictionary_extraction.py`)
- **Scope:** Processes only a handful of pages (e.g., 5-10 pages) from the first downloaded book (e.g., *Al-Qamus al-Muhit*).
- **Purpose:** 
  - Rapidly iterate on the structural regex/parsing logic.
  - Fine-tune the Ollama LLM prompt and Pydantic schema for accurate JSON extraction.
  - Verify that the resulting graph (`root`, `word`, `sentence`, `entity` + edges) is correctly formatted in a local test space.

### 2. Production Batch Flow (`batch_dictionary_extraction.py`)
- **Scope:** Processes all 6 recommended dictionaries in their entirety.
- **Purpose:**
  - Implemented as a robust **Prefect Flow** with tasks for distributed processing.
  - Includes error handling, retry logic, and progress tracking for the massive page count.
  - Orchestrates both Phase 1 (Lexical Extraction) and Phase 2 (Wikipedia Entity Enrichment) across the full dataset.
