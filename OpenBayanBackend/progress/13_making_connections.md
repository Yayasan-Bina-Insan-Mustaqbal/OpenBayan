# Plan 13: Making More Connections

## Objective
Enhance the Knowledge Graph by establishing complex cross-entity relationships across the Library and Research planes.

## Proposed Workflow
1. **Relationship Identification**:
    - **Narrative Entity Links**: Identify direct interactions between entities in the text (e.g., *Subject -> Action -> Object*).
    - **Topic Linking**: Connect sentences to a broader `taxonomy` or `subject` graph.
    - **Sentence-to-Sentence Linkage**: Identify semantic similarity, thematic clusters, or direct references between different sentences.
    - **Categorization & Tagging**: Map sentences to scholarly categories, topics, and user-generated hashtags.
    - **Citation Graph**: Identify implicit and explicit references between books.
    - **Chronological Linkage**: Map authors and events to a timeline.
2. **Graph Expansion**:
    - Use SurrealDB graph capabilities (edges) to represent these connections.
    - `entity -> interacts_with -> entity` (e.g., Prophet Musa confronting Firaun).
    - `sentence -> discusses -> topic`
    - `sentence -> related_to -> sentence` (semantic or thematic neighbors)
    - `sentence -> tagged_with -> category | hashtag`
    - `book -> cites -> book`

3. **Automated Discovery**:
    - Use LLMs to identify relationships that are not explicitly coded in the source text.
4. **Maintenance**: Prefect flows to periodically scan for new connection opportunities.

## Current Progress (2026-05-14)
- **Quran-to-Quran Connections**: ✅ 51,613 edges established (Source: `ShahamFarooq`).
- **Thematic Ayah Mapping**: ✅ 7,660 thematic links established via `classified_as` (Source: `RonnieAban`).
- **Narrator Chains (Isnad)**: ✅ 37,169+ connections established from classical Hadith sources.
- **Thematic Categories**: ✅ 1,314 unique themes/categories indexed.

## Success Criteria
- Denser Knowledge Graph with meaningful cross-references.
- Improved discovery through graph-based traversal.
