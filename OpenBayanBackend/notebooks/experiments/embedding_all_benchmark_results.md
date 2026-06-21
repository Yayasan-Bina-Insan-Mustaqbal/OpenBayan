# Extensive Embedding Benchmark Results (50,000 chunks each)

| Model | Chunks Processed | Sustained Speed (chunks/min) | Failures | Est. Time for 1M Sentences |
| :--- | :--- | :--- | :--- | :--- |
| `nomic-embed-text:latest` | 50,000 | **7,727.2** | 0 | ~2.1 Hours |
| `bge-m3:latest` | 50,000 | 5,758.6 | 0 | ~2.9 Hours |
| `mxbai-embed-large:latest` | 50,000 | 690.4 | 0 | ~24.1 Hours |

**Conclusion**: `nomic-embed-text` is over **10x faster** than `mxbai-embed-large` and will allow us to vectorize the entire ~1 million sentence database in just 2 hours instead of 24 hours.
