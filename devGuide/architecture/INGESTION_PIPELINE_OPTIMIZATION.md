# Ingestion Pipeline Optimization: The "Prep Cook and the Oven" Strategy

## Core Philosophy
To maximize the efficiency of a single-GPU setup when processing millions of Islamic texts (Athar Dataset), we must separate the CPU-bound text processing from the GPU-bound embedding generation.

## Phase 1: The Prep Cook (CPU - Sentence Splitting & Chunking)
- **Goal:** Transform raw paragraphs into optimized, token-aware chunks without touching the GPU.
- **Tools:** 
    - **BlingFire (Microsoft):** High-speed C++ backed sentence boundary disambiguation (SBD).
    - **pySBD:** High-accuracy rule-based SBD for handling complex Arabic abbreviations.
- **The Pipeline:**
    1. **SBD:** Split raw text into clean sentences.
    2. **Token-Aware Grouping:** Group sentences into chunks of 250-500 tokens (compatible with the embedding model's context window).
    3. **Overlapping:** Ensure context continuity by overlapping sentences between adjacent chunks.
    4. **Persistence:** Save these "ready-to-embed" chunks into a staging table in SurrealDB (e.g., `staged_chunks`).

## Phase 2: The Oven (GPU - Batch Embedding)
- **Goal:** Keep the GPU utilized at 100% by feeding it large batches of pre-processed chunks.
- **Optimizations:**
    1. **Asynchronous Feeding:** Use a background worker to pull chunks from SurrealDB and queue them in memory.
    2. **Maximized Batching:** Instead of 1-by-1 API calls, send arrays of 32, 64, or 128 chunks to the embedding model at once.
    3. **Half-Precision (fp16):** Load the embedding model in half-precision to double the effective batch size per GB of VRAM.
    4. **DataLoader Pattern:** Implement a producer-consumer pattern where the CPU always has the next batch ready before the GPU finishes.

## Application to Word Graph
- **Word Embedding Centroids:** For each `word`, collect its various definitions and usage sentences, chunk them using the above method, and calculate the mean vector to create a high-quality semantic centroid for that word.

---
*Strategic Goal: Transition from sequential processing (Years) to optimized pipelining (Weeks).*
