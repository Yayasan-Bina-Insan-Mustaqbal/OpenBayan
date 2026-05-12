# Plan 10: Translating Sentences

## Objective
Translate the atomic knowledge units in the `sentence` table to enable a multi-lingual Knowledge Graph.

## Proposed Workflow
1. **Sentence Selection**: Prioritize sentences from key sources (Quran, Hadith, major Tafsir).
2. **Translation Flow**:
    - Implement a Prefect flow to process sentences in parallel.
    - Leverage concurrent LLM calls for speed while maintaining semantic integrity.
3. **Database Storage**: Save translations in a structured way (e.g., a `translation` field or a linked `sentence_translation` table).
4. **Validation**: Implement a verification step to flag low-confidence translations.

## Success Criteria
- High percentage of core sentences translated.
- Semantic consistency across languages.
