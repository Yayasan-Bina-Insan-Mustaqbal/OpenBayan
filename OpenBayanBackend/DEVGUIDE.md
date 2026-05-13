# OpenBayan Backend Developer Guide

## 🚀 Getting Started
OpenBayan is a Knowledge Graph-driven research platform for Islamic texts. The backend uses **SurrealDB** for graph/vector storage and **Prefect** for data orchestration.

## 🛠 Tech Stack
- **Database**: SurrealDB (LXC instance at `192.168.100.33`)
- **Orchestration**: Prefect (Python-based flows)
- **AI/ML**: Ollama (for Embeddings)
- **Logic**: Python 3.10+

## 🏛 Database Workflow
We follow a strict **SCHEMAFULL** policy. 
- **Do not** use `CREATE` with arbitrary objects.
- **Always** ensure the `source` and `parent` (Ayah/Hadith/Book) exist before inserting `sentence` chunks.
- [DATABASE.md](devguide/DATABASE.md): SurrealDB table schema and intent.
- [REORGANIZATION_PLAN.md](devguide/REORGANIZATION_PLAN.md): Planned directory restructuring for Python scripts.
- Refer to [KNOWLEDGE_GRAPH.md](./KNOWLEDGE_GRAPH.md) for the table relationship map.

### Connecting to SurrealDB
Use the following credentials for development:
- **Namespace**: `openbayan`
- **Database**: `openbayan`
- **URL**: `http://192.168.100.33:8000`

## 📥 Ingestion Pipeline
1.  **Chunking**: Use `ingest_quran.py` or similar scripts to split text into sentences.
2.  **Enrichment**: Stripping Harakat (Tashkeel) for `simple_clean_text`.
3.  **Vectorization**: Generating embeddings for both Arabic and Transliteration.
4.  **Linking**: Relate the sentence to its parent and source.

## 🧪 Testing
Before pushing changes:
1.  Run the ingestion script on a small sample (e.g., Surah Al-Fatiha).
2.  Verify graph connectivity in Surrealist.
3.  Test vector search retrieval using `test_hybrid_search.py`.

## 📌 Coding Standards
- Follow PEP8 for Python.
- Use `logging` instead of `print`.
- structure data transformations as reusable Prefect tasks.
