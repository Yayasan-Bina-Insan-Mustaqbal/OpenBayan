# Data Pipeline: Prefect Flows & Arabic NLP Ingestion

This guide covers the **AI Factory** layer of OpenBayan — the Prefect-orchestrated Python worker that processes Islamic texts, runs Arabic NLP models, generates vector embeddings, and writes structured data into SurrealDB.

## 1. Architecture Overview

```
[Source Text / Uploaded PDF]
        │
        ▼
  [Prefect Flow]  ← Triggered manually or on a schedule
        │
    ┌───┴──────────────────────┐
    │                          │
    ▼                          ▼
[Task: prep.py]         [Task: enrich.py]
Arabic segmentation     Generate embeddings
Harakat stripping       Build graph relations
SpaCy tokenization      Write to SurrealDB
```

The Python worker (`bayan_worker`) runs inside Docker and connects to both:
- **Prefect Server** at `http://prefect-server:4200/api` — for job polling and logging.
- **SurrealDB** at `ws://surrealdb:8000/rpc` — for reading and writing knowledge graph data.

---

## 2. Setting Up the Prefect Work Pool

Before deploying any flows, create the **work pool** that the Prefect Server uses to route jobs to the worker:

```bash
# Run this ONCE after the Docker stack is up
# This creates the pool the worker listens on
docker exec bayan_worker \
  prefect work-pool create "bayan-ingestion-pool" --type process
```

> [!NOTE]
> The worker is already configured to listen to `bayan-ingestion-pool` (set in `docker-compose.yml`). You must create the pool on the server before running any flows.

---

## 3. The Ingestion Flow (`notebooks/openbayan_pipeline.py`)

This is the main Prefect `@flow`. It acts as the **director** — orchestrating the individual `@task` functions in the correct order.

```python
# notebooks/openbayan_pipeline.py

from prefect import flow, task, get_run_logger
from tasks.prep import clean_and_segment_arabic
from tasks.enrich import generate_embeddings, save_to_surrealdb

@flow(name="OpenBayan Text Ingestion", log_prints=True)
async def ingest_text(
    raw_text: str,
    owner_id: str,
    source_title: str,
    is_public: bool = False,
):
    """
    Main ingestion pipeline:
    1. Cleans and segments raw Arabic text into atomic Fawaid.
    2. Generates vector embeddings for each Faidah.
    3. Creates the Sahifah record and links all Fawaid to it.
    """
    logger = get_run_logger()

    # STAGE 1: Preparation
    logger.info(f"Starting ingestion for: '{source_title}'")
    sentences = await clean_and_segment_arabic(raw_text)
    logger.info(f"Segmented into {len(sentences)} potential Fawaid.")

    # STAGE 2: Enrichment (run embedding generation in parallel)
    embedded_fawaid = await generate_embeddings(sentences)

    # STAGE 3: Persistence
    sahifah_id = await save_to_surrealdb(
        title=source_title,
        fawaid=embedded_fawaid,
        owner_id=owner_id,
        is_public=is_public,
    )

    logger.info(f"✅ Done. Created Sahifah: {sahifah_id}")
    return sahifah_id
```

---

## 4. Preparation Tasks (`notebooks/tasks/prep.py`)

These tasks handle **Arabic-specific text cleaning** before NLP processing.

```python
# notebooks/tasks/prep.py

import re
from prefect import task

# SpaCy model for Arabic sentence boundary detection
import spacy
nlp = spacy.load("ar_core_news_sm")

@task(name="Clean & Segment Arabic Text", retries=1)
async def clean_and_segment_arabic(raw_text: str) -> list[str]:
    """
    1. Strips tashkeel (harakat / diacritics) from the text.
    2. Removes special characters and normalizes whitespace.
    3. Segments the clean text into individual sentences using SpaCy.
    """
    # Step 1: Strip harakat (Arabic diacritics / tashkeel)
    # Unicode range: U+064B to U+065F
    text = re.sub(r'[\u064B-\u065F]', '', raw_text)

    # Step 2: Normalize whitespace and remove non-Arabic noise
    text = re.sub(r'[^\w\s\u0600-\u06FF.,،؟]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()

    # Step 3: Sentence segmentation with SpaCy
    doc = nlp(text)
    sentences = [sent.text.strip() for sent in doc.sents if len(sent.text.strip()) > 10]

    return sentences

def strip_harakat(text: str) -> str:
    """Utility: Strip diacritics from Arabic text."""
    return re.sub(r'[\u064B-\u065F\u0670\u0640]', '', text)
```

---

## 5. Enrichment Tasks (`notebooks/tasks/enrich.py`)

These tasks handle **vector embedding generation** and **SurrealDB graph creation**.

```python
# notebooks/tasks/enrich.py

import os
from prefect import task, get_run_logger
from surrealdb import Surreal
from transformers import AutoTokenizer, AutoModel
import torch

# Load a multilingual or Arabic-specific embedding model
# Recommended: CAMeL-Lab/bert-base-arabic-camelbert-ca
MODEL_NAME = "CAMeL-Lab/bert-base-arabic-camelbert-ca"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)

def _mean_pooling(model_output, attention_mask):
    """Compute mean-pooled sentence embedding from token embeddings."""
    token_embeddings = model_output[0]
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    return torch.sum(token_embeddings * input_mask_expanded, 1) / torch.clamp(input_mask_expanded.sum(1), min=1e-9)

@task(name="Generate Vector Embeddings", retries=2)
async def generate_embeddings(sentences: list[str]) -> list[dict]:
    """
    Converts a list of Arabic sentences into vector embeddings.
    Returns a list of dicts with 'text' and 'embedding' keys.
    """
    logger = get_run_logger()
    results = []

    for sentence in sentences:
        encoded = tokenizer([sentence], padding=True, truncation=True, return_tensors='pt')
        with torch.no_grad():
            output = model(**encoded)
        embedding = _mean_pooling(output, encoded['attention_mask'])
        embedding_list = embedding[0].tolist()
        results.append({"text": sentence, "embedding": embedding_list})

    logger.info(f"Generated {len(results)} embeddings.")
    return results

@task(name="Save to SurrealDB", retries=3, retry_delay_seconds=5)
async def save_to_surrealdb(
    title: str,
    fawaid: list[dict],
    owner_id: str,
    is_public: bool = False,
) -> str:
    """
    Persists the ingested data to SurrealDB:
    1. Creates a Sahifah (source document) record.
    2. Creates individual Faidah records with embeddings.
    3. Creates RELATE edges linking each Faidah to the Sahifah.
    """
    async with Surreal(os.getenv("SURREAL_WS_URL")) as db:
        await db.signin({"user": os.getenv("SURREAL_USER"), "pass": os.getenv("SURREAL_PASS")})
        await db.use("openbayan", "openbayan")

        # 1. Create the Sahifah (source document)
        sahifah = await db.create("sahifah", {
            "title": title,
            "owner": f"researcher:{owner_id}",
            "is_public": is_public,
        })
        sahifah_id = sahifah[0]["id"]

        # 2. Create each Faidah and link it to the Sahifah
        for item in fawaid:
            faidah = await db.create("faidah", {
                "body": item["text"],
                "embedding": item["embedding"],
                "owner": f"researcher:{owner_id}",
                "is_public": is_public,
            })
            faidah_id = faidah[0]["id"]

            # 3. Graph relation: faidah -> extracted_from -> sahifah
            await db.query(
                f"RELATE {faidah_id}->extracted_from->{sahifah_id};"
            )

    return str(sahifah_id)
```

---

## 6. Triggering Flows Without a Gateway

OpenBayan does not need a separate API gateway to trigger ingestion. Use one of these patterns:

- **Manual/local:** run Prefect CLI commands inside the worker container.
- **Scheduled:** configure Prefect deployments and schedules.
- **User-triggered:** a Next.js server route validates the session, creates an `ingestion_job` record in SurrealDB, and the worker polls or subscribes to pending jobs.

The SurrealDB job pattern keeps authorization in the database and keeps Python focused on long-running work.

```surrealql
DEFINE TABLE IF NOT EXISTS ingestion_job SCHEMAFULL
  PERMISSIONS
    FOR select WHERE owner = $auth.id,
    FOR create WHERE $auth.id != NONE,
    FOR update, delete NONE;

DEFINE FIELD IF NOT EXISTS owner ON ingestion_job TYPE record<user>;
DEFINE FIELD IF NOT EXISTS source_title ON ingestion_job TYPE string;
DEFINE FIELD IF NOT EXISTS raw_text ON ingestion_job TYPE string;
DEFINE FIELD IF NOT EXISTS status ON ingestion_job TYPE string DEFAULT "pending"
  ASSERT $value IN ["pending", "running", "done", "failed"];
DEFINE FIELD IF NOT EXISTS flow_run_id ON ingestion_job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS error ON ingestion_job TYPE option<string>;
DEFINE FIELD IF NOT EXISTS created_at ON ingestion_job TYPE datetime DEFAULT time::now();
DEFINE FIELD IF NOT EXISTS updated_at ON ingestion_job TYPE datetime VALUE time::now();
DEFINE INDEX IF NOT EXISTS ingestion_job_status ON ingestion_job FIELDS status;
```

```ts
// openbayan/app/api/ingest/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { surrealQuery } from "@/lib/surreal-query";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.surrealToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sourceTitle, rawText } = await request.json();

  const sourceTitleLiteral = JSON.stringify(sourceTitle);
  const rawTextLiteral = JSON.stringify(rawText);

  const result = await surrealQuery(session.user.surrealToken, `
    LET $sourceTitle = ${sourceTitleLiteral};
    LET $rawText = ${rawTextLiteral};

    CREATE ingestion_job CONTENT {
      owner: $auth.id,
      source_title: $sourceTitle,
      raw_text: $rawText,
      status: "pending"
    };
  `);

  return NextResponse.json({ status: "queued", job: result });
}
```

The worker can poll pending jobs, mark one as `running`, execute `ingest_text`, then update the job with `done` or `failed`.

---

## 7. Monitoring & Debugging

| Tool | URL | Purpose |
|:---|:---|:---|
| **Prefect UI** | `http://localhost:4200` | View flow runs, logs, retries, and performance metrics. |
| **Worker Logs** | `docker logs bayan_worker -f` | Real-time logs from the Python worker process. |
| **SurrealDB Surrealist** | `http://localhost:8000` | Query the database directly via the REST UI. |

```bash
# Check if the worker is connected and polling
docker logs bayan_worker -f | grep "Connected to Prefect"

# Manually trigger a test flow run from within the worker container
docker exec -it bayan_worker python -c "
import asyncio
from notebooks.main_pipeline import ingest_text
asyncio.run(ingest_text('Test text here.', 'researcher_001', 'Test Book'))
"
```

---

## 8. Binary Document Ingestion (PDF/EPUB)

For processing binary files like PDFs and EPUBs, OpenBayan leverages SurrealDB's native file storage to bypass the need for external S3/MinIO containers.

See the dedicated guide: **[[IDEA] Book Uploading & Public Sharing](../ideas/book_uploading_public_sharing.md)** for:
- Database schema updates for native file types.
- Frontend streaming logic via SurrealDB SDK.
- Python worker tasks using `pdfplumber` for in-memory extraction.
