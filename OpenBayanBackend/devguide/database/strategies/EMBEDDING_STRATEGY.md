# Embedding Generation Strategy

This document outlines the architectural strategies for generating semantic vector embeddings to power OpenBayan's hybrid search. To perform KNN or HNSW search in SurrealDB, user queries must be converted into high-dimensional vectors using open-source models like `all-MiniLM-L6-v2`.

---

## 1. Approach 1: Client-Side Wasm (Transformers.js)
**Best for**: Zero backend compute costs and standard Next.js applications.

Instead of paying for third-party APIs, the user's browser performs the inference using [Transformers.js](https://huggingface.co/docs/transformers.js/index). This library runs highly optimized ONNX models in the browser via WebAssembly.

### Implementation Logic
1.  **Load Model**: The browser downloads a ~22MB ONNX file on the first run and caches it.
2.  **Generate Vector**: Inference is performed locally on the browser's CPU/Wasm.
3.  **Search**: Only the generated vector is sent to the backend/SurrealDB.

```javascript
import { pipeline } from '@xenova/transformers';

let extractor = null;

const handleSearch = async (query) => {
    if (!extractor) {
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    const output = await extractor(query, { pooling: 'mean', normalize: true });
    const vectorArray = Array.from(output.data);
    
    // Send to SurrealDB
    const response = await fetch('/api/search', {
        method: 'POST',
        body: JSON.stringify({ vector: vectorArray, textQuery: query })
    });
};
```

---

## 2. Approach 2: Custom Edge Wasm (Rust)
**Best for**: Global Edge APIs (Cloudflare Workers) where low latency is required without browser-side overhead.

This approach involves writing a custom Rust module that uses an inference engine like [Tract](https://github.com/sonos/tract) to handle embedding generation at the edge.

### Implementation Logic
1.  **Rust Backend**: Write a function that accepts text, runs Wasm-based inference, and returns the vector.
2.  **Deployment**: Compile using `wasm-pack` and deploy to an Edge worker.
3.  **Benefit**: No 22MB download for the user; inference happens in milliseconds at the nearest edge node.

---

## 3. Approach 3: SurrealML (In-Database Inference)
**Best for**: Unified architecture where the database manages the entire AI lifecycle.

SurrealDB's native [SurrealML](https://surrealdb.com/docs/surrealml) engine allows you to upload an `.onnx` model directly into the database. You can then call the model directly from your SurrealQL queries.

### Implementation Logic
1.  **Upload Model**: Package the ONNX model into a `.surml` file and upload it to SurrealDB.
2.  **SQL-Native Embedding**: Generate embeddings inside the query itself.

```surql
-- Step 1: Let the database generate the embedding!
LET $query = "How do I configure Next.js routing?";
LET $embedding = ml::minilm_embedding<1.0.0>({ text: $query });

-- Step 2: Run the Hybrid Search (RRF)
LET $vs = SELECT id, title FROM document WHERE embedding <|20,COSINE|> $embedding;
LET $ft = SELECT id, title FROM document WHERE content @1@ $query;

SELECT * FROM search::rrf([$vs, $ft], 5, 60);
```

---

## 4. Summary Selection Guide

| Strategy | Compute Cost | Latency | Complexity | Use Case |
| :--- | :--- | :--- | :--- | :--- |
| **Client Wasm** | Zero | High (First Load) | Low | Standard Web Apps |
| **Edge Wasm** | Low | Low | High | High-Performance APIs |
| **SurrealML** | Medium | Medium | Low | Unified DB-Centric Apps |

---

*For query optimization details (RRF, ID-Only extraction), refer to the [Search Strategy Guide](SEARCH_STRATEGY.md).*
