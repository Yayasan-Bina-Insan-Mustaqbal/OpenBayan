# Hybrid Vector Search: SurrealDB Implementation

OpenBayan enables Islamic research discovery through **Hybrid Search** — a combination of **full-text BM25 ranking** (for keyword precision) and **semantic vector search** (for conceptual meaning). This guide explains how to implement it end-to-end within the minimal FastAPI + SurrealDB architecture.

## 1. What is Hybrid Search?

| Method | How It Works | Best For |
|:---|:---|:---|
| **BM25 Full-Text** | Keyword frequency ranking (TF-IDF based). | Exact term matching: `حديث`, `سنة`. |
| **Vector (Semantic)** | Cosine similarity between dense embeddings. | Conceptual queries: "rewards of patience". |
| **Hybrid (RRF)** | Reciprocal Rank Fusion of both scores. | Best of both worlds — the recommended approach. |

SurrealDB combines both search types natively. This eliminates the need for Elasticsearch or Meilisearch as a separate service, fulfilling our goal of a consolidated, minimal stack.

---

## 2. Schema Prerequisites

Ensure both a full-text and a vector index are defined on your target table (e.g., the `faidah` table, as covered in your schema documentation):

```surrealql
-- Full-text BM25 index on the Arabic body text
DEFINE INDEX faidah_body ON faidah FIELDS body SEARCH ANALYZER ascii BM25;

-- MTREE vector index (1024-dimensional, Cosine distance)
DEFINE INDEX faidah_vector ON faidah FIELDS embedding MTREE DIMENSION 1024 DIST COSINE;
```

> [!IMPORTANT]
> The embedding dimension in the index (`DIMENSION 1024`) must **exactly match** the dimension of the embeddings produced by your Python model. CAMeL-BERT and similar Arabic models typically output 768-dim or 1024-dim. Verify your model's output size and update this accordingly.

---

## 3. The Hybrid Search Query (SurrealQL)

SurrealDB's `@@` operator triggers full-text search, while the `<|K|>` operator triggers vector nearest-neighbor search.

```surrealql
-- Hybrid Search using Reciprocal Rank Fusion (RRF)
-- Docs: https://surrealdb.com/docs/surrealql/functions/search

LET $query_text = "الصابرين في الشدة";  -- User's search term
LET $query_embedding = [0.12, 0.45, ...]; -- Pre-computed by Python

-- Run both searches and merge results using RRF
SELECT
    id,
    body,
    owner,
    source_ref,
    search::score(1) AS bm25_score,
    vector::similarity::cosine(embedding, $query_embedding) AS vector_score
FROM faidah
WHERE
    (body @@ $query_text)            -- BM25 full-text match
    OR
    embedding <|15|> $query_embedding  -- Top 15 nearest vector neighbors
ORDER BY
    (search::score(1) + vector::similarity::cosine(embedding, $query_embedding)) DESC
LIMIT 10;
```

---

## 4. FastAPI Search Endpoint

The React frontend sends a user query string to FastAPI, which:
1. Converts the query to a vector embedding using the same Arabic model used during ingestion.
2. Executes the hybrid SurrealQL search.
3. Returns ranked results.

```python
# api/routes/search.py

from fastapi import APIRouter, Depends, Query
from surrealdb import Surreal
from transformers import AutoTokenizer, AutoModel
import torch

router = APIRouter()

# Load the same model used during ingestion (e.g., CAMeL-BERT or mxbai-embed-large)
MODEL_NAME = "CAMeL-Lab/bert-base-arabic-camelbert-ca"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)

def embed_query(text: str) -> list[float]:
    """Convert a search query string into a vector embedding."""
    encoded = tokenizer([text], padding=True, truncation=True, return_tensors='pt')
    with torch.no_grad():
        output = model(**encoded)

    # Mean pooling
    token_embeddings = output[0]
    attention_mask = encoded['attention_mask']
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    embedding = (token_embeddings * input_mask_expanded).sum(1) / input_mask_expanded.sum(1).clamp(min=1e-9)

    return embedding[0].tolist()

@router.get("/api/search")
async def hybrid_search(
    q: str = Query(..., min_length=2, description="Arabic search query"),
    limit: int = Query(10, le=50),
):
    """
    Public hybrid search endpoint.
    Combines BM25 full-text and cosine vector similarity.
    """
    # 1. Convert user query to vector
    query_embedding = embed_query(q)

    # 2. Execute hybrid SurrealQL
    async with Surreal("ws://surrealdb:8000/rpc") as db:
        await db.signin({"user": "root", "pass": "root"})
        await db.use("bayan", "knowledge_graph")

        result = await db.query(
            """
            SELECT
                id, body, owner, source_ref,
                search::score(1) AS bm25_score,
                vector::similarity::cosine(embedding, $embedding) AS vector_score
            FROM faidah
            WHERE
                (body @@ $query)
                OR
                embedding <|20|> $embedding
            ORDER BY (search::score(1) + vector::similarity::cosine(embedding, $embedding)) DESC
            LIMIT $limit;
            """,
            {
                "query": q,
                "embedding": query_embedding,
                "limit": limit,
            }
        )

    return {"query": q, "results": result[0]["result"]}
```

---

## 5. Calling the Search API from React

On the React frontend, a simple `fetch` call retrieves the ranked results and displays them in the UI.

```typescript
// src/services/searchService.ts

interface SearchResult {
  id: string;
  body: string;
  source_ref: string | null;
  bm25_score: number;
  vector_score: number;
}

export async function hybridSearch(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, limit: "15" });
  const response = await fetch(`/api/search?${params}`);

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.results;
}
```

```tsx
// src/components/SearchBar.tsx
import { useState } from "react";
import { hybridSearch } from "@/services/searchService";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const data = await hybridSearch(query);
      setResults(data);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="search-container" dir="rtl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder="ابحث في الفوائد..."
        lang="ar"
      />
      <button onClick={handleSearch} disabled={isLoading}>
        {isLoading ? "جارٍ البحث..." : "بحث"}
      </button>

      <ul>
        {results.map((r) => (
          <li key={r.id} className="result-item">
            <p>{r.body}</p>
            {r.source_ref && <small>{r.source_ref}</small>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 6. Caching Search Embeddings (Performance Optimization)

Embedding generation is CPU/GPU intensive. For frequently searched terms, caching the computed vectors drastically reduces latency and server load:

```python
# api/routes/search.py (enhanced with in-memory LRU cache)
from functools import lru_cache

@lru_cache(maxsize=512)
def embed_query_cached(text: str) -> tuple:
    """
    Cached wrapper for embed_query.
    Converts text -> embedding as a hashable tuple (for LRU caching).
    """
    return tuple(embed_query(text))

# In the route, convert back to list:
query_embedding = list(embed_query_cached(q))
```

> [!TIP]
> **Scalability Tip:** For production environments running multiple FastAPI Server Workers, replace the in-memory `lru_cache` with a dedicated **Redis** instance or a SurrealDB `query_cache` table keyed by the hash of the query string. This ensures the cache is shared globally across all workers.

---

## 7. Arabic Language Considerations

When building Arabic-first search interfaces, careful text preprocessing ensures high accuracy and recall.

| Issue | Solution |
|:---|:---|
| **Diacritics (Harakat)** | Strip them before indexing AND before embedding queries using a `strip_harakat()` utility. |
| **Right-to-Left Layout** | Always add `dir="rtl"` on Arabic text containers in React to maintain proper reading flow. |
| **BM25 Analyzer** | Use the `ascii` analyzer for Arabic in SurrealDB, as it handles the Unicode range correctly. Consider `edgengram` if prefix-matching is required. |
| **Alef Normalization** | Normalize `أ`, `إ`, `آ` ➔ `ا` during preprocessing for significantly better fuzzy recall. |

```python
# Alef normalization utility (add to tasks/prep.py)
import re

def normalize_arabic(text: str) -> str:
    """Normalize common Arabic character variations for consistent indexing."""
    text = re.sub(r'[\u0617-\u061A\u064B-\u0652]', '', text)  # Strip Harakat
    text = re.sub(r'[أإآ]', 'ا', text)                        # Alef forms
    text = re.sub(r'ة', 'ه', text)                            # Ta marbuta
    text = re.sub(r'ى', 'ي', text)                            # Alef maqsura

    return text
```
