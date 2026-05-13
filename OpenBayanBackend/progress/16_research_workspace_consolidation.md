# 16. Research Workspace Consolidation Plan

This document tracks the refactoring and implementation of the Research Plane to follow the "Consolidated Node" and "Materialized Path" strategy.

## 🎯 Objectives
- Consolidate common fields (`parent`, `owner`, `path`, `visibility`) across Research Plane tables.
- Implement Materialized Path logic for `majmu` and items.
- Build efficient recursive list and permission check logic.
- Implement a sharing mapping system (`item_shares`).

## 📅 Timeline & Tasks

### Phase 1: Schema Refinement
- [ ] Add `path` string field to `majmu`, `sahifah`, and `faidah`.
- [ ] Add `visibility` enum to core research tables.
- [ ] Ensure all items have a `parent` field pointing to a `majmu`.

### Phase 2: Materialized Path Implementation
- [ ] Implement a trigger/hook in the backend to calculate `path` on record creation.
- [ ] Implement a "Rebuild Path" utility for handling folder moves (recursive update).
- [ ] Index the `path` field for prefix searching.

### Phase 3: Sharing & Permissions
- [ ] Create the `item_shares` relation table.
- [ ] Implement backend middleware to check permissions using both direct links and path-based inheritance.
- [ ] Update Research Plane `DEFINE TABLE` permissions in SurrealDB to utilize these new fields.

### Phase 4: UI/UX Integration
- [ ] Update frontend to handle "Link" vs "Fork" logic.
- [ ] Implement a unified "Item Picker" or "File Explorer" component that queries multiple tables simultaneously.

## 📊 Status Summary
- **Current Phase**: Planning
- **Last Updated**: 2026-05-13
- **Completed Tasks**: 0 / 12

## 📝 Notes
- Moving a folder is a "heavy" write operation if it has many children; this must be handled by an asynchronous Prefect task.
- Using a single-table design concept within a multi-table environment (SurrealDB) provides the best of both worlds: strict schema validation and unified query capabilities.
