# Research: Regex-Hybrid Extraction for Arabic Knowledge Graphs

**Target Books**: *Lisan al-Arab*, *Al-Qamus al-Muhit*, *Mizan al-I'tidal*

## 1. The "Hybrid" Concept
The current ingestion relies 100% on LLM inference for every chunk. While robust, this creates a significant performance bottleneck. A **Hybrid** approach uses Deterministic Regular Expressions to identify structural "Skeletons" (Entries, Roots, Numbers), while reserving LLM inference for "Semantic" enrichment (Contextual relationship extraction).

## 2. The Regex Strategy & Reality Check

Relying strictly on regex for Arabic is brittle due to the language's flexible structure. We must acknowledge the following:

### A. The Punctuation Splitter
- **Logic**: Splitting on `[.!?؟\n]+`.
- **Reality Check**: This is a weak baseline. Classical works like *Lisan al-Arab* often feature long, run-on sentences where standard punctuation is missing or used inconsistently.

### B. The Conjunction Trap
- **Logic**: Splitting on `\s+و\s+` or `\s+ف\s+`.
- **Reality Check**: **DANGEROUS.** The character `و` (wa) links individual nouns in a list just as often as it joins full sentences. Naive splitting on conjunctions results in fragmented, semantically broken data.

### C. Unicode & Diacritic Pre-processing (MANDATORY)
Before any chunking occurs, we must normalize the environment using Regex:
- **Bidirectional Markers**: Strip markers like the Right-to-Left mark `\u200F`.
- **Diacritics (Tashkeel)**: Use the block range `[\u064B-\u065F]` to optionally remove diacritics for anchor matching while preserving them for the final `sentence` record.

## 3. Structural Anchors (Shamela Format)

Despite general flaws, our specific use case benefits from **Book-Specific Anchors**:

### Mizan al-I'tidal (Narrators)
- **Primary Anchor**: `^(\d+)\s*-\s*([\u0621-\u064A\s]+)`
- **Extraction**: Maps ID and Name directly to the `entity` table.

### Al-Qamus al-Muhit (Dictionary)
- **Root Detection**: `\(([\u0621-\u064A]{3,4})\)`
- **Abbreviations**: Regex can deterministically map `(ج)` to "Plural" and `(و)` to "Root-Waw" without LLM calls.

## 4. Advanced Refinement: Seeking Higher

For scalability and high-fidelity extraction, we should evolve beyond raw Regex:

1.  **Recursive Chunking with Overlap**:
    - If a chunk exceeds a specific token limit (due to missing anchors), enforce a hard split.
    - **Crucial**: Implement a **15% text overlap** between chunks to ensure the LLM doesn't lose semantic context at the cut point.
2.  **Morphological Analyzers (Roadmap)**:
    - Integrate tools like **CAMeL Tools** or **Farasa**.
    - These tools use Part-Of-Speech (POS) tagging to distinguish if a `و` is a sentence connector or a word separator.
3.  **Transformer-Based Segmentation**:
    - Use models like **AraBERT** to understand the inherent semantic boundaries of the text for perfect tokenization.

## 5. Performance & Goal Alignment

**End Goal**: Populate a **SurrealDB Knowledge Graph** for semantic search and graph analysis.

| Method | Speed | Semantic Integrity |
|:---|:---|:---|
| **Pure Regex** | Instant | Low (Broken context) |
| **Pure LLM** | Slow | High |
| **Hybrid (Anchors + Overlap)** | **Fast** | **High** |

**Recommendation**: Implement **Anchor-Based Entry Splitting** with **Recursive Overlap** as the next phase of the OpenBayan ingestion pipeline.
