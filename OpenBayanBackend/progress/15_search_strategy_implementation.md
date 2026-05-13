# 15. Search Strategy Implementation Plan

This document tracks the implementation of the "Lightweight Graph & Semantic Search Architecture" designed to optimize hybrid search and graph traversals.

## 🎯 Objectives
- Implement Reciprocal Rank Fusion (RRF) for hybrid search.
- Reduce network overhead using ID-Only extraction.
- Minimize database load via batched graph traversals.
- Implement a Redis caching layer ("The Redis Shield").
- Accelerate queries using Scope-First retrieval (metadata filtering).

## 📅 Timeline & Tasks

### Phase 1: Native Hybrid Search (SurrealDB)
- [ ] Update `sentence` table indexes to ensure HNSW and BM25 are optimized.
- [ ] Implement RRF query logic in the backend search service.
- [ ] Benchmark RRF performance against manual fusion.

### Phase 2: Query Optimization
- [ ] Refactor search endpoints to return `id` only in the first pass.
- [ ] Implement secondary "hydration" queries to fetch full payloads for top results.
- [ ] Implement batched word-relationship queries to avoid N+1 issues during sentence analysis.

### Phase 3: The Redis Shield
- [ ] Set up Redis connection in the backend.
- [ ] Implement caching for static graph connections (Word -> Root, Word -> Meanings).
- [ ] Implement trending search tracking using Redis ZSET.

### Phase 4: Scope-First Filtering
- [ ] Add pre-filtering logic to search queries based on source edition, surah, or category.
- [ ] Validate performance improvements on large datasets.

## 📊 Status Summary
- **Current Phase**: Planning
- **Last Updated**: 2026-05-13
- **Completed Tasks**: 0 / 12

## 📝 Notes
- Ensure SurrealDB 3.0.5 features are fully utilized for `search::score()`.
- Redis TTL should be set based on data volatility (static connections vs. trending logs).
