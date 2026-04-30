# Database Design: SurrealDB Schema & Knowledge Graph

OpenBayan uses SurrealDB as its **single, unified database engine** — replacing what would normally require Postgres (relational), pgvector (vector search), Neo4j (graph), and Redis (caching) with one tool.

## 1. Why SurrealDB for Islamic Research Data?

Islamic texts have a naturally graph-shaped structure. A single *Faidah* (benefit/note) can:
- Be **owned by** a researcher.
- Be **extracted from** a *Sahifah* (document/book).
- Be **tagged with** multiple *Alamat* (marks/labels).
- Be **related to** other Fawaid via *Majmu* (collection).

SurrealDB's **graph relations** (`RELATE`) model this natively without JOIN tables. Its **multi-model** nature means the document, its tags, its vector embedding, and its owner relationships are all stored and queried in the same engine.

---

## 2. Core Table Definitions (SurrealQL)

Run these once to initialize the database schema. These definitions also encode the **row-level security rules** for the React frontend.

> [!IMPORTANT]
> Run all `DEFINE` statements while authenticated as `root`. The row-level `PERMISSIONS` rules apply to record users authenticated through SurrealDB access tokens stored by NextAuth.

### The Researcher (User)

```surrealql
DEFINE TABLE researcher SCHEMAFULL
    PERMISSIONS
        FOR select WHERE id = $auth.id,
        FOR create NONE,
        FOR update, delete WHERE id = $auth.id;

DEFINE FIELD email    ON researcher TYPE string  ASSERT string::is::email($value);
DEFINE FIELD name     ON researcher TYPE string;
DEFINE FIELD role     ON researcher TYPE string  DEFAULT "user"
    ASSERT $value IN ["user", "admin"];
DEFINE FIELD avatar   ON researcher TYPE option<string>;
DEFINE FIELD created  ON researcher TYPE datetime DEFAULT time::now();

DEFINE INDEX researcher_email ON researcher FIELDS email UNIQUE;
```

### Sahifah (Document / Book)

The primary document entity. A *Sahifah* is a researcher's notebook or a source text.

```surrealql
DEFINE TABLE sahifah SCHEMAFULL
    PERMISSIONS
        FOR select WHERE owner = $auth.id OR is_public = true,
        FOR create WHERE $auth.id != NONE,
        FOR update, delete WHERE owner = $auth.id;

DEFINE FIELD title      ON sahifah TYPE string;
DEFINE FIELD content    ON sahifah TYPE option<string>; -- BlockNote JSON or raw text

-- [ROADMAP] Native File Support (See ideas/book_uploading_public_sharing.md)
DEFINE FIELD document   ON sahifah TYPE option<file>;
DEFINE FIELD file_name  ON sahifah TYPE option<string>;
DEFINE FIELD mime_type  ON sahifah TYPE option<string>; -- e.g., 'application/pdf'
DEFINE FIELD ai_status  ON sahifah TYPE string DEFAULT "pending" 
    ASSERT $value IN ["pending", "processing", "completed", "failed"];

-- [ROADMAP] Verification & Integrity (See ideas/book_verification_integrity.md)
DEFINE FIELD integrity_score      ON sahifah TYPE option<float>;
DEFINE FIELD verification_status  ON sahifah TYPE string DEFAULT "quarantine" 
    ASSERT $value IN ["quarantine", "ai_verified", "human_approved", "rejected"];
DEFINE FIELD trust_origin         ON sahifah TYPE string DEFAULT "user_upload"
    ASSERT $value IN ["user_upload", "verified_shamela", "verified_waqfeya"];

DEFINE FIELD is_public  ON sahifah TYPE bool DEFAULT false;
DEFINE FIELD owner      ON sahifah TYPE record<researcher>;
DEFINE FIELD created    ON sahifah TYPE datetime DEFAULT time::now();
DEFINE FIELD updated    ON sahifah TYPE datetime VALUE time::now();

-- Full-text search index
DEFINE INDEX sahifah_title ON sahifah FIELDS title SEARCH ANALYZER ascii BM25;
-- Vector embedding index (1024-dim, cosine similarity)
DEFINE INDEX sahifah_vector ON sahifah FIELDS embedding MTREE DIMENSION 1024 DIST COSINE;

DEFINE FIELD embedding  ON sahifah TYPE option<array<float>>;
```

### Faidah (Benefit / Research Note)

The atomic unit of knowledge. A *Faidah* is a single insight, quote, or finding extracted from a *Sahifah*.

```surrealql
DEFINE TABLE faidah SCHEMAFULL
    PERMISSIONS
        FOR select WHERE owner = $auth.id OR is_public = true,
        FOR create WHERE $auth.id != NONE,
        FOR update, delete WHERE owner = $auth.id;

DEFINE FIELD body       ON faidah TYPE string  ASSERT string::len($value) > 0;
DEFINE FIELD source_ref ON faidah TYPE option<string>; -- e.g., "Ibn Kathir, Vol 2, p.45"
DEFINE FIELD is_public  ON faidah TYPE bool DEFAULT false;
DEFINE FIELD owner      ON faidah TYPE record<researcher>;
DEFINE FIELD created    ON faidah TYPE datetime DEFAULT time::now();
DEFINE FIELD updated    ON faidah TYPE datetime VALUE time::now();

-- Full-text + vector search
DEFINE INDEX faidah_body   ON faidah FIELDS body SEARCH ANALYZER ascii BM25;
DEFINE INDEX faidah_vector ON faidah FIELDS embedding MTREE DIMENSION 1024 DIST COSINE;

DEFINE FIELD embedding  ON faidah TYPE option<array<float>>;
```

### Majmu (Collection)

A *Majmu* groups multiple *Fawaid* under a research theme or book chapter.

```surrealql
DEFINE TABLE majmu SCHEMAFULL
    PERMISSIONS
        FOR select WHERE owner = $auth.id OR is_public = true,
        FOR create WHERE $auth.id != NONE,
        FOR update, delete WHERE owner = $auth.id;

DEFINE FIELD title       ON majmu TYPE string;
DEFINE FIELD description ON majmu TYPE option<string>;
DEFINE FIELD is_public   ON majmu TYPE bool DEFAULT false;
DEFINE FIELD owner       ON majmu TYPE record<researcher>;
DEFINE FIELD created     ON majmu TYPE datetime DEFAULT time::now();
```

### Alamah (Mark / Tag)

Reusable tags/labels that can be attached to any entity.

```surrealql
DEFINE TABLE alamah SCHEMAFULL
    PERMISSIONS
        FOR select FULL, -- Tags are globally visible
        FOR create, update, delete WHERE $auth.role = "admin";

DEFINE FIELD label      ON alamah TYPE string  ASSERT string::len($value) > 0;
DEFINE FIELD color      ON alamah TYPE option<string>;
DEFINE FIELD category   ON alamah TYPE option<string>; -- e.g., "aqeedah", "fiqh", "hadith"

DEFINE INDEX alamah_label ON alamah FIELDS label UNIQUE;
```

---

## 3. Graph Relations (The Knowledge Graph)

These are the **edges** of the knowledge graph. They model the relationships between entities without duplicating data.

```surrealql
-- A Faidah is EXTRACTED FROM a specific Sahifah
DEFINE TABLE extracted_from SCHEMAFULL TYPE RELATION IN faidah OUT sahifah
    PERMISSIONS FOR select, create, delete WHERE in.owner = $auth.id;

-- A Faidah or Sahifah IS TAGGED WITH an Alamah
DEFINE TABLE tagged_with SCHEMAFULL TYPE RELATION IN faidah|sahifah OUT alamah
    PERMISSIONS FOR select FULL, FOR create, delete WHERE in.owner = $auth.id;

-- A Majmu CONTAINS many Fawaid
DEFINE TABLE contains SCHEMAFULL TYPE RELATION IN majmu OUT faidah
    PERMISSIONS FOR select FULL, FOR create, delete WHERE in.owner = $auth.id;
```

### Querying the Graph

```surrealql
-- Get all Fawaid and their source Sahifah, for a specific researcher
SELECT *, ->extracted_from->sahifah.* AS source_book
FROM faidah WHERE owner = researcher:user_id_here;

-- Graph traversal: "Find all Fawaid in the 'aqeedah' topic area"
SELECT * FROM faidah
WHERE ->tagged_with->alamah[WHERE category = "aqeedah"];

-- Find all items in a collection, with their tags
SELECT *, ->contains->faidah.* AS fawaid
FROM majmu:my_collection_id FETCH fawaid.->tagged_with->alamah.*;
```

---

## 4. Connecting from Next.js and the Python Worker

Next.js server routes and server actions should query SurrealDB with the logged-in record token from the NextAuth session. This lets SurrealDB enforce `$auth.id` permissions directly.

```ts
// Server-side only
await fetch(`${process.env.SURREAL_HTTP_URL}/sql`, {
  method: "POST",
  headers: {
    "Accept": "application/json",
    "Content-Type": "application/json",
    "Surreal-NS": "main",
    "Surreal-DB": "main",
    "Authorization": `Bearer ${session.user.surrealToken}`,
  },
  body: "SELECT * FROM faidah WHERE owner = $auth.id OR is_public = true;",
});
```

The Prefect data worker connects as `root` to perform high-privilege schema setup and data ingestion tasks.

```python
from surrealdb import Surreal
import os

async def get_db_connection():
    """Creates an authenticated root connection for background worker tasks."""
    db = Surreal(os.getenv("SURREAL_WS_URL", "ws://surrealdb:8000/rpc"))
    await db.connect()
    await db.signin({
        "user": os.getenv("SURREAL_USER", "root"),
        "pass": os.getenv("SURREAL_PASS", "root"),
    })
    await db.use("main", "main")
    return db

async def ingest_faidah(owner_id: str, body: str, embedding: list[float]):
    """Example: Ingesting a new Faidah with its vector embedding."""
    db = await get_db_connection()
    result = await db.create("faidah", {
        "body": body,
        "owner": f"researcher:{owner_id}",
        "embedding": embedding,
        "is_public": False,
    })
    await db.close()
    return result
```

---

## 5. Full Schema Bootstrap Script

Save as `notebooks/setup_schema.py` and run once after the Docker stack is up:

```bash
# Connect to the running SurrealDB container and run the schema
docker exec -it bayan_surrealdb surreal sql \
  --conn ws://localhost:8000/rpc \
  --user root --pass root \
  --ns main --db main \
  --file /app/schema.surql
```

> [!TIP]
> SurrealDB's `DEFINE ... IF NOT EXISTS` pattern is idempotent — safe to run the schema script multiple times without side effects. Always include it in your setup pipelines.
