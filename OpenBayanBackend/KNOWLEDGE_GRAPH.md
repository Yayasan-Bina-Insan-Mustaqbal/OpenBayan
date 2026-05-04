# OpenBayan Knowledge Graph Architecture (Research Corpus)

## 1. Overview: The Triple-Anchor Design
This architecture resides in the **`openbayan`** database. It is built on a **Triple-Anchor** design in SurrealDB. Instead of a flat table, data is normalized into three distinct layers to ensure scalability, semantic richness, and future-proofing for Quran, Hadith, and Turath (Classical Books).

### The Three Anchors:
1.  **`source` (The Authority)**: Defines *where* the data came from (e.g., Uthmani Text, Sahih International, Shamela Waqfeya).
2.  **`ayah` | `hadith` | `book_section` (The Parent)**: Defines *where* in the corpus the text resides (Coordinates).
3.  **`sentence` (The Leaf)**: The actual chunk of text, its transliterations, and its AI embeddings.

---

## 2. Table Reference

### Core Content
| Table | Description |
| :--- | :--- |
| `source` | Metadata about the edition, language, and version. |
| `ayah` | Quranic coordinates (Surah, Ayah, Page, Juz). |
| `hadith` | Prophetic narration metadata (Collection, Number, Grade). |
| `book` | Master catalog for Turath books (Title, Author, Category). |
| `book_section` | Specific physical location in a book (Volume, Page). |
| `sentence` | The "Atomic Unit" of text. Links to a `parent` and a `source`. |

### Linguistic Layer
| Table | Description |
| :--- | :--- |
| `word` | Individual words extracted from sentences. |
| `root` | The triliteral/quadriliteral Arabic root (`jidhr`). |
| `contains` | **Edge table** connecting `sentence` -> `word` with `position`. |

### Knowledge Graph Layer
| Table | Description |
| :--- | :--- |
| `entity` | Named Entities (People, Places, Concepts, Events). |
| `topic` | High-level research themes (Nested hierarchy). |
| `category` | Fixed taxonomy for library classification. |
| `mentions` | **Edge table** connecting `sentence` -> `entity`. |
| `tagged_with` | **Edge table** connecting any content to a `topic` or `category`. |

---

## 3. Graph Relationships
The graph is designed for deep traversal. Because fields are typed as `record<T>`, SurrealDB allows you to hop across tables without complex JOINs.

### The Traversal Path:
`ROOT` ← `WORD` ← **`SENTENCE`** → `PARENT (Ayah/Hadith/Book)`
`SENTENCE` → `ENTITY`
`SENTENCE` → `TOPIC`

---

## 4. Query Examples (SurrealQL)

### Find the Root of a specific Ayah:
```surreal
SELECT ->contains->word->root.* FROM sentence 
WHERE parent = ayah:1;
```

### Find all Hadith mentioned in the same Topic as a Quranic Verse:
```surreal
-- Hop from Ayah to Topic, then back down to Hadith
SELECT <-tagged_with<-sentence[WHERE parent INSIDE hadith].* 
FROM (SELECT ->tagged_with->topic FROM sentence WHERE parent = ayah:1);
```

### Search by Phonetic Transliteration (Vector Search):
```surreal
SELECT *, vector::similarity::cosine(embedding_trans, [0.1, 0.2...]) AS score 
FROM sentence 
WHERE embedding_trans <|10|> [0.1, 0.2...] 
ORDER BY score DESC;
```

---

## 5. Maintenance
All tables are defined as `SCHEMAFULL`. Any new fields must be explicitly added via `DEFINE FIELD` to maintain data integrity.
