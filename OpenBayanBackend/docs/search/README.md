# Search & Retrieval Architecture

## Goal
The search system aims to provide researchers with highly relevant, cross-corpus results that combine classical exact-match precision with modern semantic understanding.

## Expected Results
Researchers expect:
1. **Holistic View**: Results from Quran, Hadith, and scholarly Books in a single interface.
2. **Contextual Relevance**: Sentences that explain *concepts*, not just contain keywords.
3. **Traceability**: Every search result must be linked back to its original `source` (Book/Edition) and `parent` (Ayah/Page).
4. **Knowledge Extraction**: Highlighting of Entities and Relationships found within the results.

## Search Methodology: Hybrid Retrieval
OpenBayan utilizes a **Hybrid Search** strategy implemented within SurrealDB, combining two distinct planes:

### 1. Lexical Plane (BM25)
- **Tool**: Full-Text Search (FTS) index on the `content` field.
- **Strength**: Finding exact matches, rare terminology, and specific names.
- **Processing**: Standard Arabic normalization (removing Harakat, unifying Alif/Ya).

### 2. Semantic Plane (HNSW Vector)
- **Tool**: HNSW Index on the `embedding` field (1024 dimensions).
- **Strength**: Finding synonyms, conceptually related verses, and answering questions where the exact terminology might differ.
- **Model**: `mxbai-embed-large` (running locally via Ollama).

## The Search Workflow

1. **Query Normalization**: The user's query is cleaned and normalized for the lexical index.
2. **Embedding Generation**: The query is sent to Ollama to generate a 1024-dimension vector.
3. **Parallel Retrieval**:
   - **FTS Query**: Retrieves top K matches based on keyword frequency.
   - **Vector Query**: Retrieves top K matches based on cosine similarity.
4. **Reciprocal Rank Fusion (RRF)**:
   - Results from both planes are merged.
   - A combined score is calculated to prioritize results that appear in both or have exceptionally high scores in one.
5. **Contextual Enrichment**:
   - For each result, the system `FETCH`es the `source` and `parent` metadata.
   - Entities mentioned in the sentence are retrieved to provide interactive tooltips.
6. **Final Ranking**: Results are returned to the frontend sorted by the fused score.

## Search Result Anatomy
A typical search result returned to the UI includes:
- **Text**: The atomic sentence/chunk.
- **Metadata**: Source title, Author, and Page/Ayah reference.
- **Entities**: List of people/places/concepts identified in that sentence.
- **Score**: A confidence indicator of relevancy.

## Future Roadmap
- **Reranking**: Implementing a secondary Cross-Encoder model to fine-tune the top 10 results.
- **Faceted Filtering**: Allowing users to filter by `Taxonomy` (e.g., only Fiqh books) or `Topic`.
- **Graph Search**: Ability to search for entities and find all sentences where they interact with another specific entity.
