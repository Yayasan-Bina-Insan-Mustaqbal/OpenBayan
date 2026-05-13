# Lightweight Graph & Semantic Search Architecture

This document outlines the architectural strategy for performing highly efficient hybrid searches (Fuzzy Text + Semantic Vector) and graph traversals using SurrealDB, shielded by Redis.

The primary goal of this architecture is to minimize computational overhead and avoid database bottlenecks during complex multi-hop queries.

---

## 1. Native Reciprocal Rank Fusion (RRF)

Do not pull raw vector scores and text scores into your application to calculate the final ranking. Force SurrealDB to do the fusion in-memory before returning the payload.

### The Mechanism
Define an HNSW index on the embedding column and a Full-Text Search (BM25) index on the text column.

### The Execution
Combine both in a single query and rank them using combined scoring (SurrealDB's `search::score()` or RRF logic).

### The Hard Limit
Always append a strict `LIMIT` (e.g., `LIMIT 10`). The database must only calculate exact scores for the highest-probability matches, dropping the rest of the dataset instantly.

```surql
-- Conceptual SurrealQL Hybrid Search
SELECT id 
FROM sentences 
WHERE text @1@ $query_text OR embedding <|10|> $query_vector
ORDER BY search::score(1) + search::score(2) DESC
LIMIT 10;
```

---

## 2. ID-Only Extraction

Extracting full data payloads (especially 1024-dimensional vector arrays) across the network is slow and memory-intensive.

*   **Step 1**: The initial hybrid search must return only the `id` of the matched sentences.
*   **Step 2**: Use those specific IDs to fetch the actual text and immediate graph connections.

**Why it matters**: It prevents the database from serializing massive, unused vector embeddings over the network to your application.

---

## 3. Batched Graph Traversals (Avoiding N+1)

When extracting words from the resulting sentences to find their graph relationships, executing a query for every single word will overwhelm the database with individual read operations.

*   **Deduplication**: In your application logic, extract all words from your sentence results and deduplicate them into a single, flat array.
*   **Batching**: Send exactly one query to SurrealDB using an `IN` clause to fetch all relationships at once.
*   **Depth Limits**: Enforce strict depth limits on the graph edges to prevent runaway traversals on highly common words.

```surql
-- Conceptual Batched Graph Query
SELECT id, text, ->connections->words LIMIT 5
FROM words 
WHERE text IN ['surreal', 'database', 'graph', 'optimization'];
```

---

## 4. The Redis Shield

SurrealDB should only process queries that require deep graph traversal or complex vector math. Everything else must be intercepted by Redis.

### Caching Graph Relationships
Language connections are static. The semantic neighbors of the word "database" rarely change.
*   Check Redis for a word's graph payload before querying SurrealDB.
*   If a cache miss occurs, query SurrealDB and save the resulting JSON payload in Redis with a 24-to-48 hour Time-To-Live (TTL).

### Managing "Trending" Searches
Never write user search logs to SurrealDB during the active search cycle. This turns a fast read into a slow write.
*   Use a Redis Sorted Set (ZSET) to track trending queries.
*   Fire an asynchronous `ZINCRBY trending_searches 1 "user_query"` command to Redis. It handles high-throughput incrementing in RAM with zero impact on your core database.

---

## 5. Scope-First Retrieval

Vector math (calculating the distance between high-dimensional arrays) is inherently expensive. Do not run it against the entire database if you don't have to.

*   **Pre-filtering**: If the user is searching within a specific category, author, or time range, apply a standard boolean `WHERE` clause to your query before the vector search.
*   **The Result**: Filtering out 80% of the table using cheap metadata checks means the expensive HNSW algorithm only has to calculate distances against the remaining 20% of the data.
