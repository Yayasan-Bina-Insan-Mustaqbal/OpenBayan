# Ollama Quran Chunk Benchmark

Date: 2026-04-22

Notebook: `OpenBayanBackend/notebooks/experiments/ollama_quran_chunk_benchmark.ipynb`

Runtime: Docker Compose `jupyter` service from `OpenBayanBackend/docker-compose.yml`. Do not run notebook experiments from host Python.

## Goal

Find a practical local Ollama model and Quran target chunk size for first-pass SurrealDB ingestion.

The chunking pattern keeps surrounding context in the prompt while requiring the model to produce metadata for the target chunk only. This lets OpenBayan store canonical Quran text once, then attach chunk records, categories, entities, and graph relations without polluting target refs with neighboring ayahs.

## Tested Sweep

- Models: `llama3.2:3b`, `qwen2.5:7b`
- Target chunk sizes: 80 words, 160 words
- Context: previous + next window included in prompt
- Whole Quran estimate: 77,430 Arabic words
- Output contract: one JSON object with `primary_category`, `secondary_categories`, `entities`, `relations`, `summary_ar`, and `surrealdb_notes`

Larger default notebook sweep includes `gemma2:9b`, `aya:latest`, and 260-word chunks, but that full sweep was too slow for this run. The completed run used the smaller 2-model/2-size sweep above.

## Results

| model | chunk size | runs | avg seconds/chunk | JSON valid | quality score | avg entities | avg relations | estimated Quran chunks | estimated full runtime |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `qwen2.5:7b` | 160 | 2 | 15.428 | 100% | 1.000 | 5.00 | 4.50 | 484 | 124.5 min / 2.07 h |
| `qwen2.5:7b` | 80 | 3 | 12.964 | 100% | 0.983 | 4.67 | 3.67 | 968 | 209.2 min / 3.49 h |
| `llama3.2:3b` | 160 | 2 | 4.675 | 100% | 0.792 | 1.00 | 2.50 | 484 | 37.7 min / 0.63 h |
| `llama3.2:3b` | 80 | 3 | 4.067 | 100% | 0.767 | 1.00 | 1.00 | 968 | 65.6 min / 1.09 h |

## Recommendation

Use `qwen2.5:7b` with 160 target words for first ingestion pass.

Why:

- Best observed JSON/category/entity/relation quality in this sample.
- 160-word targets reduce total chunk count from 968 to 484.
- Estimated full Quran runtime is about 2.07 hours on one sequential worker.
- Neighbor context remains enough for meaning without making each call too large.

Use `llama3.2:3b` with 160 target words when speed matters more than relation richness. It estimated 37.7 minutes for the whole Quran, but extracted fewer entities and weaker relation structure in this run.

## SurrealDB Shape

Recommended records:

- `source_chunk`: Quran target text, `source_refs`, chunk index, target word count, model name, quality/audit metadata
- `context_window`: previous refs, next refs, optional text hashes or snapshots
- `category`: stable taxonomy nodes such as `aqidah`, `duaa`, `ibadah`, `ahkam`
- `entity`: divine names, scripture concepts, people, groups, places
- `relation`: model-supported relation statements from target chunk

Recommended edges:

- `RELATE source_chunk->has_category->category`
- `RELATE source_chunk->mentions->entity`
- `RELATE source_chunk->supports_relation->relation`

Keep canonical ayahs separate. Store refs on chunks and relations; do not duplicate full neighboring context unless UI/debugging requires snapshots.

## Caveats

This is a small benchmark sample, not final production validation. Before ingesting full Quran, rerun with representative Makki/Madani passages, legal verses, narratives, short surahs, long ayahs, and human-reviewed gold labels.

Also test parallel workers. Current estimates assume one sequential worker and warmed models through Ollama `keep_alive`.
