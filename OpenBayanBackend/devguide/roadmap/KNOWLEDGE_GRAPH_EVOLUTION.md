# Knowledge Graph Evolution: Semantic Word Connectivity

## Vision
To move beyond simple dictionary definitions into a deeply interconnected **Semantic Word Graph**. Every concept (word) in the Islamic Knowledge Graph should not only have a definition and a vector embedding but also explicit, AI-verified relationships to other concepts.

## Phase 1: High-Resolution Vectorization
- **Objective:** Generate vector embeddings for every unique `word` record in the database.
- **Status:** Currently, embeddings are generated for `sentence` records (definitions). We need to ensure the `word` entities themselves have a centroid or representative embedding.
- **Process:** Use a specialized Arabic embedding model (e.g., `mxbai-embed-large` via Ollama) to represent the semantic space of each word.

## Phase 2: Relational Discovery & AI Synthesis
- **Objective:** Establish semantic links (edges) between words that go beyond "synonym" or "root".
- **Methodology:**
    1. **Semantic Search:** For a given word (e.g., "Qonaah"), perform a vector search to find the top $N$ semantically related words.
    2. **AI Categorization:** Feed the word pair and their definitions to an LLM.
    3. **Relationship Suggestion:** The AI suggests the *nature* of the connection.
        - *Example:* "Qonaah" (قناعة) -> "Qolb" (قلب).
        - *AI Suggestion:* "Qonaah is a state/activity of the Qolb (Heart)."
        - *Graph Result:* `(word:Qonaah)-[:PART_OF_ACTIVITY]->(word:Qolb)`
    4. **Hierarchical Structuring:** This allows us to map concepts like "Acts of the Heart", "Jurisprudential Categories", or "Theological Pillars" automatically.

## Phase 3: Graph Navigation
- **Result:** Every word has a graph of connections to other words, creating a web of Islamic concepts that can be navigated non-linearly.
- **Utility:** Enables advanced RAG (Retrieval-Augmented Generation) where the AI can "walk" the graph to find related concepts even if the exact keyword isn't in the query.

---
*Documented on: 2026-05-07*
*Strategic Goal: Move from a "List of Definitions" to a "Web of Meanings".*
