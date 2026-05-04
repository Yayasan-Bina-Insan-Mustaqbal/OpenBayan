# OpenBayan Knowledge Graph — Database Reference

> **Database**: `openbayan` · **Namespace**: `openbayan` · **Engine**: SurrealDB 3.0.5
>
> This document is the single source of truth for the database schema. All tables, fields, relations, and indexes are documented here.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Visual Graph Map](#2-visual-graph-map)
3. [Library Plane — Immutable Source Texts](#3-library-plane--immutable-source-texts)
4. [Taxonomy Plane — Classification](#4-taxonomy-plane--classification)
5. [Linguistic Plane — Word & Root](#5-linguistic-plane--word--root)
6. [Research Plane — User Workspace](#6-research-plane--user-workspace)
7. [Relation Tables (Graph Edges)](#7-relation-tables-graph-edges)
8. [Auth & Access](#8-auth--access)
9. [Index Reference](#9-index-reference)
10. [Key Query Patterns](#10-key-query-patterns)

---

## 1. Architecture Overview

The OpenBayan Knowledge Graph is a **unified multi-model database** that lives entirely in a single SurrealDB database. It is organized into four logical planes:

| Plane | Purpose | Tables |
|:---|:---|:---|
| **Library** | Immutable source texts from Quran, Hadith, Books | `source`, `ayah`, `hadith`, `book`, `book_section`, `sentence` |
| **Taxonomy** | Classification and named entities | `topic`, `category`, `entity`, `word`, `root` |
| **Research** | User-generated research artifacts | `user`, `faidah`, `majmu`, `sahifah`, `bahs`, `alamah` |
| **UI State** | Persistent frontend state | `workspace`, `user_feedback` |

> **Design Principle**: The Library Plane is append-only and AI-enriched. The Research Plane is user-owned and protected by row-level permissions. Relations (arrows in Surrealist) connect everything into a traversable knowledge graph.

---

## 2. Visual Graph Map

```
LIBRARY PLANE                    TAXONOMY PLANE
─────────────────────────────    ──────────────────────
source                           topic (hierarchical)
  └─ book                          └─ topic (parent)
       └─ book_section           category (tags)
            └─ sentence ─────────────────────────────────┐
                 │               entity ◄──── entity_relation
                 │                 ▲
                 ├─[tagged_with]──▶ topic | category
                 ├─[mentions]─────▶ entity
                 └─[composed_of]─▶ word ──▶ root
ayah ◄─── sentence.parent
hadith ◄── sentence.parent

RESEARCH PLANE
─────────────────────────────────────────────────────────
user ──[alamah]──▶ sentence | entity | faidah
                 | sahifah | bahs | category | topic
                      │
                      ▼
              faidah (note on alamah)
                      │
majmu (folder) ◄──[contains]──▶ alamah | faidah
  └─ majmu (subfolder)          | sahifah | bahs | majmu
```

---

## 3. Library Plane — Immutable Source Texts

### `source` — Edition/Corpus

Represents a specific edition or version of a text (e.g., `quran_uthmani`, `sahih_bukhari`).

| Field | Type | Description |
|:---|:---|:---|
| `identifier` | `string` | Unique slug (e.g., `quran_uthmani`) |
| `type` | `string` | One of: `quran`, `hadith`, `book` |
| `language` | `string` | ISO language code (e.g., `ar`) |
| `url` | `string?` | Source API or origin URL |
| `title` | `string?` | Human-readable title |
| `version` | `string?` | Version or edition name |

---

### `ayah` — Quranic Verse

One record per verse. Stores the canonical Uthmani text and optional AI-generated summary.

| Field | Type | Description |
|:---|:---|:---|
| `surah_number` | `int` | Surah number (1–114) |
| `ayah_number` | `int` | Ayah number within the surah |
| `uthmani_text` | `string` | Full Arabic text with Tashkeel |
| `summary` | `string?` | AI-generated semantic summary |
| `embedding_summary` | `array<float, 1024>?` | Vector of the summary (for high-level search) |
| `created_at` | `datetime` | Ingestion timestamp |

**Unique Index**: `ayah_coords` on `(surah_number, ayah_number)`.

---

### `hadith` — Hadith Text

| Field | Type | Description |
|:---|:---|:---|
| `book_number` | `string?` | Book reference number |
| `chapter_title` | `string?` | Chapter name |
| `collection` | `string?` | Collection name (e.g., Bukhari) |
| `grade` | `string?` | Authenticity grade (Sahih, Hasan, etc.) |
| `hadith_number` | `string?` | Hadith number |
| `isnad` | `string?` | Chain of narration |
| `main_full` | `string?` | Full hadith matn text |

---

### `book` & `book_section` — Classical Books

**`book`** — Top-level book record.

| Field | Type | Description |
|:---|:---|:---|
| `author` | `string?` | Author name |
| `category` | `string?` | Subject category |
| `extra_metadata` | `object?` | Flexible metadata |
| `source` | `record<source>` | Pointer to edition |
| `title` | `string` | Book title |

**`book_section`** — A chapter or section within a book.

| Field | Type | Description |
|:---|:---|:---|
| `book` | `record<book>` | Parent book |
| `chapter_title` | `string?` | Section/chapter title |
| `extra_metadata` | `object?` | Flexible metadata |
| `page` | `int?` | Page number |
| `volume` | `int?` | Volume number |

---

### `sentence` — Core Knowledge Atom ⭐

The most important table. Every piece of searchable text is stored here as a sentence-level chunk. Kept intentionally **lean** — source-specific metadata lives in `parent` and `metadata`.

| Field | Type | Description |
|:---|:---|:---|
| `text` | `string` | Arabic text with Tashkeel (with vowels) |
| `simple_clean_text` | `string?` | Stripped Arabic (no Tashkeel), used for BM25 search |
| `chunk_index` | `int` | Position within the parent ayah/hadith |
| `parent` | `record<ayah\|hadith\|book_section>` | **Required.** Pointer to source record |
| `source` | `record<source>` | **Required.** Pointer to edition |
| `embedding` | `array<float, 1024>` | Semantic vector for Arabic content |
| `embedding_transliteration` | `array<float, 1024>?` | Semantic vector for transliterated content |
| `embedding_clean` | `array<float, 1024>?` | Semantic vector for clean Arabic |
| `metadata` | `object?` | Auxiliary data: `{ transliterations: {en,ru,tr}, hizb_quarter, juz, page }` |
| `mention_count` | `int` *(computed)* | Auto-count of entity mentions in this sentence |
| `created_at` | `datetime` | Ingestion timestamp |

**Indexes**:
| Index | Fields | Type |
|:---|:---|:---|
| `sentence_vector` | `embedding` | HNSW (cosine, dim 1024) |
| `sentence_transliteration_vector` | `embedding_transliteration` | HNSW (cosine, dim 1024) |
| `sentence_text_bm25` | `text` | FULLTEXT BM25 |
| `quranSentenceIndex` | `parent, chunk_index` | Standard |
| `sentence_parent_index` | `parent` | Standard |
| `sentence_source_index` | `source` | Standard |

> **Why so lean?** `surah_number`, `juz`, `hizb_quarter`, and transliterations are removed from top-level fields. They live in `metadata` (flexible) or are reachable via `parent` (graph traversal). This keeps the core table fast and prevents data duplication.

---

## 4. Taxonomy Plane — Classification

### `topic` — Hierarchical Chapters (Bab/Fasl)

Represents structural divisions of knowledge, like chapters in a book. **Not** the same as `category`.

| Field | Type | Description |
|:---|:---|:---|
| `label` | `string` | English label |
| `label_ar` | `string?` | Arabic label |
| `description` | `string?` | Optional description |
| `parent` | `record<topic>?` | Parent topic for hierarchy (Bab → Fasl) |
| `source` | `record<source>?` | Which book/corpus this belongs to |
| `created_at` | `datetime` | Timestamp |

**Index**: `topic_label` on `label`.

---

### `category` — Semantic Tags

Flat/hierarchical taxonomy labels used to classify content (e.g., "Tafsir", "Fiqh", "Aqidah").

| Field | Type | Description |
|:---|:---|:---|
| `label` | `string` | English label (unique) |
| `label_ar` | `string?` | Arabic label |
| `description` | `string?` | What this category covers |
| `note` | `string?` | Scholarly note |
| `color` | `string?` | UI color hex |
| `classification` | `string?` | Meta-type: `subject`, `entity`, `attribute` |
| `parent` | `record<category>?` | Parent for subcategory hierarchy |
| `owner` | `record<user>?` | If null = global/system tag |
| `popularity` | `int` *(computed)* | Auto-count of `tagged_with` edges pointing here |
| `created_at` | `datetime` | Timestamp |

**Unique Index**: `category_label` on `label`.

---

### `entity` — Named Entities

People, places, events, and concepts mentioned in the texts.

| Field | Type | Description |
|:---|:---|:---|
| `name` | `string` | Entity name (unique) |
| `type` | `string` | Type: `Divine`, `Celestial`, `Prophetic`, `Person`, `Group`, `Place`, `Scripture`, `Afterlife`, `Object`, `Event`, `Concept` |
| `created_at` | `datetime` | Timestamp |

**Unique Index**: `entity_name` on `name`.

---

## 5. Linguistic Plane — Word & Root

### `word` — Arabic Lexical Unit

| Field | Type | Description |
|:---|:---|:---|
| `text` | `string` | Primary Arabic word with Tashkeel |
| `simple_text` | `string` | Clean Arabic without Tashkeel |
| `root` | `record<root>?` | Triliteral root pointer |
| `grammar` | `object?` | Grammatical analysis |
| `translations` | `object` | Mapped by lang code: `{ en: [{ text, source, is_ai, timestamp }] }` |
| `transliterations` | `object` | Mapped by lang code: `{ en: [{ text, source, is_ai, timestamp }] }` |
| `created_at` | `datetime` | Timestamp |

> **Metadata Enforcement**: Every entry in `translations` and `transliterations` **must** include:
> - `source`: The specific scholarly author or the AI model name.
> - `is_ai`: Boolean flag indicating if it was generated by a LLM.
> - `timestamp`: Exact time of record creation.

### `root` — Triliteral Arabic Root

| Field | Type | Description |
|:---|:---|:---|
| `arabic_root` | `string` | The root letters |
| `identifier` | `string` | Unique identifier |
| `created_at` | `datetime` | Timestamp |

---

## 6. Research Plane — User Workspace

### `user` — Researcher Account

| Field | Type | Constraint | Description |
|:---|:---|:---|:---|
| `username` | `string` | Required | Unique username |
| `name` | `string?` | — | Display name |
| `email` | `string` | Valid email, unique | Login email |
| `password` | `string` | Argon2 hashed | Auth credential |
| `role` | `string` | `researcher`/`editor`/`admin` | Default: `researcher` |
| `created_at` | `datetime` | — | Account creation time |

**Permissions**: Each user can only `select`, `update`, `delete` their own record.
**Auth**: JWT via `account` ACCESS. Token valid 1h, session 24h.

---

### `alamah` — Bookmark *(RELATION: user → target)*

> **This is a graph edge, not a normal table.** An `alamah` is created when a user bookmarks something. It carries the breadcrumb of *where* and *how* it was found.

| Field | Type | Description |
|:---|:---|:---|
| `in` | `record<user>` | The user who bookmarked |
| `out` | `record<sentence\|entity\|faidah\|sahifah\|bahs\|category\|topic>` | What was bookmarked |
| `breadcrumb` | `object?` | Context: `{ query, filters, position, bahs_id }` |
| `note` | `string?` | Quick inline label |
| `created_at` | `datetime` | When bookmarked |

> **Key Rule**: `alamah` is **immutable** once created. It is a record of *what you saw and where*. Notes written on it become `faidah`.

---

### `faidah` — Research Note

> Always tied to an `alamah`. You cannot write a note without first bookmarking a source. This enforces scholarly provenance.

| Field | Type | Description |
|:---|:---|:---|
| `owner` | `record<user>` | Author (default: `$auth.id`) |
| `ref_alamah` | `record<alamah>` | **Required.** The bookmark this note is about |
| `body` | `string` | The note content (min length 1) |
| `is_public` | `bool` | Default: `false` |
| `forked_from` | `record<faidah>?` | Set if this is a diverged copy |
| `embedding` | `array<float, 1024>?` | Semantic vector for note retrieval |
| `created_at` | `datetime` | Creation time |
| `updated_at` | `datetime` | Auto-updated on every save |

**Permissions**: Owner only. Public fawa'id readable by all.

**Indexes**:
| Index | Fields | Type |
|:---|:---|:---|
| `faidah_body` | `body` | FULLTEXT BM25 |
| `faidah_vector` | `embedding` | HNSW (cosine, dim 1024) |
| `faidah_owner` | `owner` | Standard |

---

### `sahifah` — User Document

A longer-form user-written article or research document.

| Field | Type | Description |
|:---|:---|:---|
| `title` | `string` | Document title (required) |
| `content` | `string` | Full markdown content |
| `author` | `record<user>` | Author (default: `$auth.id`) |
| `is_public` | `bool` | Default: `false` |
| `tags` | `array<string>` | Freeform tag strings |
| `importance_score` | `int` *(computed)* | Auto-count of `tagged_with` edges |
| `created_at` | `datetime` | Creation time |
| `updated_at` | `datetime` | Auto-updated on save |

**Index**: `sahifahTitleIndex` — FULLTEXT BM25 on `title`.

---

### `majmu` — Collection / Folder

Nestable folder for organizing research artifacts. Like a directory in a file tree.

| Field | Type | Description |
|:---|:---|:---|
| `owner` | `record<user>` | Owner (default: `$auth.id`) |
| `title` | `string` | Folder name (required) |
| `description` | `string?` | Optional description |
| `color` | `string?` | UI color |
| `icon` | `string?` | UI icon name |
| `parent` | `record<majmu>?` | Parent folder (enables nesting) |
| `is_public` | `bool` | Default: `false` |
| `created_at` | `datetime` | Creation time |
| `updated_at` | `datetime` | Auto-updated on save |

> Items are added to a `majmu` via the `contains` relation (see below). Items are not copied — they are linked. A `faidah` or `sahifah` can exist in multiple folders simultaneously (like hard links). If the user wants a **divergent copy**, a new record is created with `forked_from` set.

---

### `bahs` — Search/Query Log

Renamed from `search_history`. A saved research session. First-class artifact — can be added to a `majmu`.

| Field | Type | Description |
|:---|:---|:---|
| `owner` | `record<user>` | Who ran the query |
| `query` | `string` | The search query text (required) |
| `filters` | `object?` | Applied filters (source, date range, etc.) |
| `result_count` | `int?` | Number of results returned |
| `created_at` | `datetime` | Timestamp |

---

### `workspace` — UI State

Persists the user's frontend layout across sessions.

| Field | Type | Description |
|:---|:---|:---|
| `user` | `record<user>` | Owner |
| `name` | `string` | Workspace name (required) |
| `layout` | `object` | Panel layout configuration |
| `active_tabs` | `array<string>` | Currently open tabs |
| `created_at` | `datetime` | Creation time |
| `updated_at` | `datetime` | Auto-updated |

---

## 7. Relation Tables (Graph Edges)

> In Surrealist's Table Graph view, these appear as **dashed-border boxes** with arrows. They are the "Verbs" that connect the "Noun" tables.

### Summary of All Relations

| Relation | From (`in`) | To (`out`) | Purpose |
|:---|:---|:---|:---|
| `alamah` | `user` | `sentence\|entity\|faidah\|sahifah\|bahs\|category\|topic` | User bookmark |
| `contains` | `majmu` | `alamah\|faidah\|sahifah\|bahs\|majmu` | Folder membership |
| `tagged_with` | `sentence\|hadith` | `topic\|category` | AI/system classification |
| `mentions` | `record<sentence\|hadith>` | `record<entity>` | Named entity link |
| `entity_relation` | `record<entity>` | `record<entity>` | Entity-to-entity relationship |
| `entity_tagged_with` | `record<entity>` | `record<category>` | Entity taxonomy |
| `composed_of` | `record<sentence>` | `record<word>` | Linguistic breakdown |
| `extracted_from` | `record<faidah>` | `record<sahifah\|ayah>` | *(Legacy — see note)* |

---

### `contains` — Folder Contents

| Field | Type | Description |
|:---|:---|:---|
| `in` | `record<majmu>` | The folder |
| `out` | `record<alamah\|faidah\|sahifah\|bahs\|majmu>` | The item or subfolder |
| `is_fork` | `bool` | Default: `false`. `true` = diverged copy |
| `position` | `int?` | Ordering within the folder |
| `created_at` | `datetime` | When added |

---

### `tagged_with` — Classification

| Field | Type | Description |
|:---|:---|:---|
| `in` | `record<sentence\|hadith>` | The text being classified |
| `out` | `record<topic\|category>` | The classification label |
| `weight` | `int` | Confidence score 1–10 (default: 5) |
| `reasoning` | `string?` | AI reasoning for the tag |
| `created_at` | `datetime` | When tagged |

---

### `mentions` — Named Entity Recognition

| Field | Type | Description |
|:---|:---|:---|
| `in` | `record<sentence\|hadith>` | The text |
| `out` | `record<entity>` | The mentioned entity |
| `score` | `float?` | NER confidence score |
| `created_at` | `datetime` | When detected |

---

### `entity_relation` — Entity-to-Entity Links

Captures relationships between named entities as found in the texts.

| Field | Type | Description |
|:---|:---|:---|
| `in` | `record<entity>` | Subject entity |
| `out` | `record<entity>` | Object entity |
| `relation_type` | `string` | e.g., `sent_to`, `teacher_of`, `student_of` |
| `description` | `string?` | Free-text description |
| `source_ref` | `record<sentence\|hadith>?` | Verse/hadith where this relation is found |
| `created_at` | `datetime` | Timestamp |

**Example**: `entity:musa -[entity_relation { relation_type: "sent_to" }]-> entity:pharaoh`

---

### `composed_of` — Linguistic Breakdown

Links a sentence to the individual Arabic words it contains.

| Field | Type | Description |
|:---|:---|:---|
| `in` | `record<sentence>` | The sentence |
| `out` | `record<word>` | A word in the sentence |
| `position` | `int` | Word order position |

**Index**: `composed_of_order` on `(in, position)` — enables reconstructing word order.

---

## 8. Auth & Access

Authentication uses SurrealDB's `RECORD ACCESS` with JWT.

```surql
DEFINE ACCESS account ON DATABASE TYPE RECORD
  SIGNUP ( CREATE user CONTENT {
    username: $username, name: $name, email: $email,
    password: crypto::argon2::generate($password)
  })
  SIGNIN ( SELECT * FROM user
    WHERE email = $email
    AND crypto::argon2::compare(password, $password)
  )
  DURATION FOR TOKEN 1h, FOR SESSION 1d;
```

### Permission Model

| Table | select | create | update | delete |
|:---|:---|:---|:---|:---|
| `faidah` | owner OR public | `$auth.id` != NONE | owner | owner |
| `majmu` | owner OR public | `$auth.id` != NONE | owner | owner |
| `sahifah` | owner OR public | `$auth.id` != NONE | owner | owner |
| `bahs` | owner | `$auth.id` != NONE | owner | owner |
| `workspace` | owner | NONE (system) | owner | owner |
| `user_feedback` | owner | NONE (system) | owner | owner |
| `user` | own record | NONE (system) | own record | own record |
| Library tables | ALL | NONE | NONE | NONE |

---

## 9. Index Reference

| Table | Index Name | Fields | Type |
|:---|:---|:---|:---|
| `sentence` | `sentence_vector` | `embedding` | HNSW cosine 1024 |
| `sentence` | `sentence_transliteration_vector` | `embedding_transliteration` | HNSW cosine 1024 |
| `sentence` | `sentence_text_bm25` | `text` | FULLTEXT BM25 |
| `sentence` | `quranSentenceIndex` | `parent, chunk_index` | Standard |
| `sentence` | `sentence_parent_index` | `parent` | Standard |
| `sentence` | `sentence_source_index` | `source` | Standard |
| `faidah` | `faidah_body` | `body` | FULLTEXT BM25 |
| `faidah` | `faidah_vector` | `embedding` | HNSW cosine 1024 |
| `faidah` | `faidah_owner` | `owner` | Standard |
| `ayah` | `ayah_coords` | `surah_number, ayah_number` | UNIQUE |
| `user` | `userEmailIndex` | `email` | UNIQUE |
| `category` | `category_label` | `label` | UNIQUE |
| `entity` | `entity_name` | `name` | UNIQUE |
| `topic` | `topic_label` | `label` | Standard |
| `sahifah` | `sahifahTitleIndex` | `title` | FULLTEXT BM25 |
| `majmu` | `majmu_owner` | `owner` | Standard |
| `bahs` | `bahs_owner` | `owner` | Standard |
| `composed_of` | `composed_of_order` | `in, position` | Standard |

---

## 10. Key Query Patterns

### Hybrid Search — Arabic Text
```surql
-- BM25 keyword search
SELECT * FROM sentence WHERE text @@ 'الصبر';

-- Vector semantic search
SELECT *, vector::similarity::cosine(embedding, $vec) AS score
FROM sentence WHERE embedding <|10|> $vec;
```

### Get All Words in a Sentence
```surql
SELECT ->composed_of->(word.*) FROM sentence:quran_2_255_chunk_0;
```

### Get All Sentences Tagged With a Topic
```surql
SELECT <-tagged_with<-(sentence.*) FROM topic:sabr;
```

### Get All Entities Mentioned in a Surah
```surql
SELECT ->mentions->entity.name, ->mentions->entity.type
FROM sentence WHERE parent.surah_number = 28;
```

### Get a User's Bookmarks (Alamah)
```surql
SELECT ->(alamah.*), ->(alamah.out.*) FROM user:$auth.id;
```

### Get All Fawa'id for a Bookmark
```surql
-- All fawa'id written on bookmarks of a specific sentence
SELECT * FROM faidah WHERE ref_alamah.out = sentence:quran_2_255_chunk_0;
```

### Navigate a Majmu' Folder Tree
```surql
-- Get top-level folders for a user
SELECT * FROM majmu WHERE owner = $auth.id AND parent = NONE;

-- Get contents of a folder
SELECT ->contains->(out.*) FROM majmu:my_folder_id;
```

### Multi-Hop: Topic → Sentences → Entities
```surql
-- All entities found in sentences about 'Sabr'
SELECT ->tagged_with<-sentence->mentions->entity.name
FROM topic WHERE label = 'Patience';
```

---

*Last updated: 2026-05-04 | Schema version: v2 (Migration v2)*
