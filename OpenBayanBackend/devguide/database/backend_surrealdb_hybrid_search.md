# Hybrid Vector Search: SurrealDB Implementation

OpenBayan enables Islamic research discovery through **Hybrid Search** — a combination of **full-text BM25 ranking** (for keyword precision) and **semantic vector search** (for conceptual meaning). This guide explains how to implement it end-to-end with SurrealDB as the search backend and Next.js as the thin web boundary.

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
    search::rrf(search::score(1), vector::similarity::cosine(embedding, $query_embedding)) DESC
LIMIT 10;

```

---

## 4. Next.js Search Route

The React frontend sends a user query string to a Next.js route handler, which:

1. Reads the current NextAuth session when private results are needed.
2. Gets or generates the query embedding using the same model family used during ingestion.
3. Executes the hybrid SurrealQL search.
4. Returns ranked results.

For local development, keep heavy embedding generation in the Python worker or Jupyter container. The route handler should prefer cached query embeddings from SurrealDB and only call a worker-backed embedding path when needed.

```ts
// openbayan/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type SearchRow = {
  id: string;
  body: string;
  source_ref: string | null;
  bm25_score: number;
  vector_score: number;
};

async function surrealQuery<T>(
  sql: string,
): Promise<T> {
  const response = await fetch(`${process.env.SURREAL_HTTP_URL}/sql`, {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "Surreal-NS": process.env.SURREAL_NAMESPACE ?? "openbayan",
      "Surreal-DB": process.env.SURREAL_DATABASE ?? "openbayan",
      "Authorization": `Basic ${Buffer.from(
        `${process.env.SURREAL_USER}:${process.env.SURREAL_PASS}`,
      ).toString("base64")}`,
    },
    body: sql,
  });

  if (!response.ok) {
    throw new Error(`SurrealDB search failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function getQueryEmbedding(query: string): Promise<number[]> {
  const queryLiteral = JSON.stringify(query);
  const cached = await surrealQuery<Array<{ result: Array<{ embedding: number[] }> }>>(
    `SELECT embedding FROM query_cache WHERE query = ${queryLiteral} LIMIT 1;`,
  );

  const embedding = cached[0]?.result?.[0]?.embedding;
  if (embedding) return embedding;

  throw new Error("Missing query embedding. Generate it through the Python worker first.");
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const limit = Math.min(Number(request.nextUrl.searchParams.get("limit") ?? 10), 50);

  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters." }, { status: 400 });
  }

  const embedding = await getQueryEmbedding(q);
  const queryLiteral = JSON.stringify(q);
  const embeddingLiteral = JSON.stringify(embedding);

  const result = await surrealQuery<Array<{ result: SearchRow[] }>>(
    `
    LET $query = ${queryLiteral};
    LET $embedding = ${embeddingLiteral};
    LET $limit = ${limit};

    SELECT
      id,
      body,
      source_ref,
      search::score(1) AS bm25_score,
      vector::similarity::cosine(embedding, $embedding) AS vector_score
    FROM faidah
    WHERE
      (body @@ $query)
      OR
      embedding <|20|> $embedding
    ORDER BY search::rrf(search::score(1), vector::similarity::cosine(embedding, $embedding)) DESC
    LIMIT $limit;
    `,
  );

  return NextResponse.json({ query: q, results: result[0]?.result ?? [] });
}
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

## 6. Caching Search Embeddings

Embedding generation is CPU/GPU intensive. For frequently searched terms, caching the computed vectors drastically reduces latency and server load:

```surrealql
DEFINE TABLE IF NOT EXISTS query_cache SCHEMAFULL;
DEFINE FIELD IF NOT EXISTS query ON query_cache TYPE string;
DEFINE FIELD IF NOT EXISTS embedding ON query_cache TYPE array<float>;
DEFINE FIELD IF NOT EXISTS created_at ON query_cache TYPE datetime DEFAULT time::now();
DEFINE INDEX IF NOT EXISTS query_cache_query ON query_cache FIELDS query UNIQUE;
```

> [!TIP]
> Store query embeddings in SurrealDB instead of an in-memory cache. This keeps the cache shared across all Next.js containers and avoids adding Redis before it is actually needed.

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
