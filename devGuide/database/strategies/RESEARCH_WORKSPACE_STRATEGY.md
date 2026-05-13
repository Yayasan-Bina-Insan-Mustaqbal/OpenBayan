# Research Workspace & File System Strategy

This document outlines the architectural strategy for the OpenBayan Research Plane, focusing on a consolidated "Item" design and performance optimizations for deep hierarchies.

---

## 1. The Consolidated Node Pattern

To avoid the "Multi-Table Trap" (where moving or sharing different types of artifacts requires complex logic across multiple tables), we treat all research artifacts as **Nodes** within a unified system.

### Consolidated Schema logic
While we maintain specific tables for schema validation (`faidah`, `sahifah`, `majmu`), they all share a common "Node" interface:

*   **`parent`**: Pointer to the `majmu` (folder) containing this item. `NONE` if root.
*   **`owner`**: The `user` who created the item.
*   **`path`**: (Materialized Path) A string representation of the hierarchy (e.g., `/root/folder_id/subfolder_id`).
*   **`visibility`**: `private`, `shared`, or `public`.

---

## 2. Moving, Copying, and Linking

### Moving
In SurrealDB, moving an item into a new folder is a single `UPDATE`:
```surql
UPDATE $item_id SET parent = $new_folder_id, path = $new_path;
```

### Copying vs. Forking
*   **Copy (Deep Copy)**: Create a new record with the same content.
*   **Fork**: Create a new record and set the `forked_from` field in `metadata` to the original ID. This preserves the lineage while allowing independent edits.

### The Link (Virtual Reference)
Instead of duplicating data, use the `alamah` (Bookmark) relation as a virtual link.
*   A `link` item type can be represented by an `alamah` edge that exists inside a `majmu`.
*   This ensures the content remains "live" and always reflects the original source.

---

## 3. The Sharing Architecture (`item_shares`)

For granular access control, we use a mapping between items and users:

*   **`in`**: The item being shared (`majmu`, `sahifah`, etc.)
*   **`out`**: The user receiving access.
*   **`role`**: `viewer`, `editor`, `contributor`.

**Inheritance Logic**: When checking permissions for a file, the system checks:
1. Does the user have a direct `item_shares` link?
2. Does the user have an `item_shares` link to any ID present in the item's `path`?

---

## 4. Scaling with Materialized Paths

SurrealDB's graph traversals are powerful, but for **deep hierarchies** (e.g., 10+ levels deep), recursively checking parent permissions can become expensive.

### The Optimization
We implement a **Materialized Path** as a string field:
`path: "/majmu_id_1/majmu_id_2/item_id"`

*   **Fast Hierarchy Retrieval**: `SELECT * FROM items WHERE path CONTAINS $folder_id;`
*   **Instant Permission Checks**: A single query can verify if a user has access to any folder in the path prefix without multiple graph hops.

---

## 5. Summary of Best Practices

1.  **Favor consolidated queries**: Use `SELECT * FROM (majmu, sahifah, faidah) WHERE parent = $id` to list folder contents in one go.
2.  **Async Path Updates**: When a folder is moved, trigger an asynchronous background task (via Prefect) to update the `path` field for all its recursive children.
3.  **ZSET for Trending**: Use Redis to track which research folders or documents are "trending" or "frequently accessed" to keep the main DB lean.
