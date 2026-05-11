# OpenBayan Knowledge Graph - Progress Report (02)

**Date**: May 11, 2026
**Status**: Parallelism Optimized & Ingestion Accelerated

## 1. Architectural Optimization Overview
To address the ingestion bottleneck, the following structural changes were implemented:
- **Unified Pipeline**: Moved `Extraction` + `Embedding` + `Database Save` into a single atomic parallel task (`process-chunk-task`).
- **Parallel Workers**:
    - **Dictionary**: Increased to **20 parallel threads**.
    - **Ilm al-Rijal**: Increased to **14 parallel threads**.
- **Batch Processing**: Increased batch sizes (50 for Dictionary, 30 for Rijal) to maximize Ollama server utilization.
- **Thread Safety**: Implemented per-task SurrealDB connection management.

## 2. Updated Throughput & Predictions
Observed performance after optimization (May 11, 2026, 10:09 AM):

| Job | Optimized Rate | Remaining | New Est. Completion | Improvement |
|:---|:---|:---|:---|:---|
| **Dictionary Extraction** | **~6.5 roots/min** | ~77,000 chunks | **~8.2 Days** | ⚡ 3.5x Faster |
| **Ilm al-Rijal Extraction** | **~35 entities/min** | ~21,000 pages | **~10 Hours** | ⚡ 5.7x Faster |

## 3. Database Metrics (Post-Optimization Start)
| Table | Current Count | Growth (since last report) |
|:---|:---|:---|
| **`root`** | **6,953** | +32 |
| **`entity`** | **31,695** | +115 |
| **`category`** | **16** | ✅ (Taxonomy Seeded) |

## 4. Resource Monitoring
- **Dev Server CPU**: Handling 34 concurrent Python threads across 4 cores (I/O bound).
- **Ollama Server**: Responding stably to concurrent LLM and Embedding requests.
- **Disk Usage**: Remains at **88%**. Monitoring for log file growth.

## 5. Next Steps
- [ ] Implement Regex-based hybrid extraction for Dictionary to further reduce completion time from 8 days to < 24 hours.
- [ ] Audit `entity` link quality in the graph explorer.
