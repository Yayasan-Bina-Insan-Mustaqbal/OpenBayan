# OpenBayan User Data Architecture

## 1. Overview
User data is stored in a separate database (**`openbayan_user`**) to ensure privacy, security, and a clean separation from the research corpus. This database handles everything related to user identity, personalization, and research activity.

---

## 2. Table Reference

### Identity & Access
| Table | Description |
| :--- | :--- |
| `user` | User profiles, credentials, and roles (`admin`, `researcher`, `user`). |

### Personalization (Alamah)
| Table | Description |
| :--- | :--- |
| `alamah` | High-performance bookmarks. Stores a `target_id` and `target_db` to link to the Research Corpus. |
| `majmu` | Collections or "Folders" used to group `alamah` and `sahifah` entries. |

### Private Research
| Table | Description |
| :--- | :--- |
| `sahifah` | Private notes and user-generated content. Can be tagged for organization. |

### Audit & Analytics
| Table | Description |
| :--- | :--- |
| `activity_log` | Tracks search history, reading activity, and interactions for personalized features. |

---

## 3. Cross-Database Referencing
Since `openbayan` (Research) and `openbayan_user` (User) are separate databases, we use **ID String Referencing**:

- **Alamah Target**: Instead of a hard graph link, we store the ID as a string:
  - `target_id: "sentence:xyz"`
  - `target_db: "openbayan"`

This allows the UI to fetch the research content from the main corpus while keeping the user's bookmark private.

---

## 4. Security & Permissions
- **Row-Level Security**: Users can only `SELECT`, `UPDATE`, or `DELETE` records where `author == $auth.id`.
- **Encryption**: Passwords must be hashed using `argon2`.
