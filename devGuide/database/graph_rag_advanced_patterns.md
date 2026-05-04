# Advanced GraphRAG: Multi-Hop Intelligence in OpenBayan

This guide demonstrates how to use the hardened OpenBayan Knowledge Graph for advanced retrieval, combining vector search with deterministic graph traversals.

## 1. The Multi-Hop Concept

In a standard RAG system, you only search for text similarity. In **OpenBayan GraphRAG**, we use the graph to discover relationships that vector search alone might miss.

**Example Scenario:** "Find sentences that mention the Prophet (PBUH) which are also categorized under 'Theology'."

---

## 2. Hybrid Multi-Hop Query (SurrealQL)

This query combines **Vector Search** (for semantic relevance) with **Graph Filtering** (for factual precision) and **Traversals** (to pull related context).

```surrealql
-- LET $prompt_vector = [...]; -- Pre-computed embedding of the user's question

SELECT
    text,
    chunk_index,
    -- Multi-hop traversal: Get labels of all categories linked to this sentence
    ->tagged_with->category.label AS categories,
    -- Get names of all entities mentioned in this sentence
    ->mentions->entity.name AS mentioned_entities,
    -- Hop back to the Parent Ayah to get its coordinate
    <-parent<-ayah.{surah_number, ayah_number} AS coordinates
FROM sentence
WHERE 
    embedding <|5|> $prompt_vector -- Semantic Match
    AND (
        ->tagged_with->(category WHERE label = 'Theology') -- Graph Filter 1
        AND
        ->mentions->(entity WHERE type = 'Prophet')      -- Graph Filter 2
    )
ORDER BY vector::similarity::cosine(embedding, $prompt_vector) DESC;
```

---

## 3. Discovering Transitive Relationships

One of the "So What?" advantages of SurrealDB is finding connections between entities that don't appear in the same sentence.

**Query:** "Find all categories related to 'Prophet Muhammad' via the sentences that mention him."

```surrealql
SELECT 
    DISTINCT name AS entity_name,
    <-mentions<-sentence->tagged_with->category.label AS related_themes
FROM entity:prophet_muhammad;
```

---

## 4. Operational Excellence Tips

### Direct Record Addressing
Always prefer selecting by ID for O(1) performance:
```surrealql
-- DO THIS (Fast)
SELECT * FROM ayah:quran_2_255;

-- AVOID THIS (Triggers table scan)
SELECT * FROM ayah WHERE surah_number = 2 AND ayah_number = 255;
```

### Using UPSERT for Idempotency
Ensure your ingestion scripts don't create duplicates by using `UPSERT` with unique IDs:
```surrealql
UPSERT entity:makkah SET 
    name = 'Makkah', 
    type = 'Place';
```

---

## 5. Summary of Multimodal Advantage

| Feature | Pure Vector Store | OpenBayan (SurrealDB) |
| :--- | :--- | :--- |
| **Search** | Semantic only | Hybrid (FTS + Vector + Graph) |
| **Integrity** | None (Orphaned chunks) | `ENFORCED` Relations |
| **Context** | Limited to chunk | Recursive Multi-hop Traversals |
| **Updates** | Costly re-indexing | O(1) Pointer-based updates |

Wallahualam.
