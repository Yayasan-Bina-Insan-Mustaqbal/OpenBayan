# Ingestion Bottleneck Analysis (June 2026)

## Executive Summary
The OpenBayan knowledge graph requires the atomization and vector embedding of millions of Islamic texts (Quran, Hadith, Athar, and Classical Books). Currently, the pipeline is processing sentences at a rate that would take **years** to complete.

As of May/June 2026, the ingestion progress stands at **~1.1%**:
*   **Total Clean Chunks (Sentences) Extracted:** 177,960
*   **Target:** ~15,000,000 sentences (from 7.47 million source records).

### Live Sentence Distribution
A direct breakdown of the `sentence` table reveals exactly where the sequential atomizers stalled out:
- **Quran & Tafsir:** Base Quran (`quran_uthmani`) is 100% complete with 10,519 chunks. However, various Tafsirs (e.g., `tafsir_id_wajiz`, `tafsir_ar_muyassar`) stalled out with ~46,505 chunks across 10 sources.
- **Classical Books & Dictionaries:** The `murad_dataset` stalled at 95,716 chunks. The ingestion of classical dictionaries like *Al-Qamus Al-Muhit* stalled at 19,153 chunks, and *Lisan Al-Arab* barely started, stalling at 112 chunks.
- **Hadith & Athar:** Completely stalled. The *Hadith Sanadset* halted at a mere 25 chunks out of its ~7.4M target.

This document analyzes the technical bottleneck causing this extreme delay and outlines the architectural shift required to solve it.

## The Bottleneck: `atomize_hadith_v5.py`

The root cause of the delay lies in the current implementation of the Prefect flows (e.g., `atomize_hadith_v5.py`). While the [Ingestion Pipeline Optimization Strategy](INGESTION_PIPELINE_OPTIMIZATION.md) dictates a decoupled "Prep Cook and Oven" approach with high-throughput batching, the actual implementation is purely sequential.

### Key Flaws in Current Implementation:

1.  **1-by-1 Sequential Embeddings:** 
    The script iterates through sentences individually and makes a blocking HTTP POST request to the Ollama server for every single sentence.
    ```python
    for idx, segment in enumerate(sentences):
        # Blocking HTTP call per sentence!
        embedding = get_embedding(clean_segment) 
    ```
    For 15 million sentences, this translates to 15 million sequential HTTP round-trips.

2.  **GPU Underutilization:**
    Because requests are sent one by one, the GPU on the remote server (`100.121.116.17`) sits idle waiting for network latency to resolve. It processes a tiny fraction of data per forward pass, rather than a full batch of 64 or 128 items.

3.  **Tightly Coupled Logic:**
    The CPU operations (Regex boundary detection, DB fetching) and GPU operations (Embedding) are locked in the same synchronous loop.

## The Solution: Asynchronous Producer-Consumer Pipeline

To transition this pipeline from **years** to **weeks**, we must leverage Ollama's native batching capabilities via the new `/api/embed` endpoint.

### 1. Shift to the `/api/embed` Endpoint
The legacy `/api/embeddings` endpoint takes a single `"prompt"`. The new `/api/embed` endpoint takes an array of strings in `"input"`, allowing the GPU to process them in parallel in a single forward pass.
```json
{
  "model": "mxbai-embed-large:latest",
  "input": ["Sentence 1", "Sentence 2", "Sentence 3", "... up to 128"]
}
```

### 2. Architectural Redesign (The "Oven" Strategy)
The pipeline must be decoupled into two independent stages:

*   **Stage 1: The CPU Producer (The Prep Cook)**
    *   Fetches raw texts from SurrealDB in large batches.
    *   Runs Regex/AI sentence splitting.
    *   Pushes clean, token-aware chunks into an intermediate queue or staging table (e.g., `staged_sentences`).
*   **Stage 2: The GPU Consumer (The Oven)**
    *   Pulls blocks of 64-128 sentences from the staging area.
    *   Fires a single bulk request to Ollama `/api/embed`.
    *   Receives the 1024-d vectors and writes them to the `sentence` table in a single SurrealDB transaction.

By implementing this architecture, network overhead is reduced by 99%, and GPU utilization is maximized, unblocking the ingestion of the remaining 14.8 million sentences.
