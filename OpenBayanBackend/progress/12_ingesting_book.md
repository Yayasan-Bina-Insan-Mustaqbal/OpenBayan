# Plan 11: Ingesting Books

## Objective
Standardize the ingestion of classical books into the Library Plane (`book`, `book_section`, `book_page`).

## Proposed Workflow
1. **Cataloging**: Register book metadata in the `source` and `book` tables.
2. **Structural Digestion**:
    - Chunk content into `book_section` and `book_page`.
    - Maintain hierarchy (Volume, Chapter, Page).
3. **Knowledge Extraction**:
    - Parse pages into atomic units in the `sentence` table.
    - Tag sentences with source metadata.
4. **Automation**: Use existing `ingest_shamela_books.py` as a template for other digitized sources.

## Success Criteria
- Books correctly indexed in the Library Plane.
- All text searchable at the sentence level.
