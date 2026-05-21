# 18. Hadith Multiple Numbering Systems

This document records the complete implementation and execution of parallel numbering system enrichment for all 10 available Hadith collections in SurrealDB.

## 🎯 Objectives

- Add parallel numbering fields to the `hadith` table to support cross-referencing across different scholarly editions and digital publications.
- Enrich all available collections using the [fawazahmed0/hadith-api](https://github.com/fawazahmed0/hadith-api) CDN.
- Build indexes for fast cross-reference lookups.

---

## 📐 Schema Changes

### New Fields on `hadith` Table

| Field | Type | Description |
|---|---|---|
| `num_in_book` | `none \| int` | Position within the specific kitab/book (resets per book) |
| `num_arabic` | `none \| number \| string` | Number from the authoritative Arabic printed edition |
| `num_fuad_baqi` | `none \| number \| string` | Muhammad Fuad Abdul Baqi academic standard numbering |
| `num_usc_msa` | `none \| string` | Legacy USC-MSA `"Vol. X, Book Y, Hadith Z"` string (Bukhari only) |
| `chapter_number` | `none \| int` | Numeric chapter (bab) index within its kitab |
| `book_name_ar` | `none \| string` | Arabic name of the kitab section |

### New Indexes

| Index | Fields | Purpose |
|---|---|---|
| `idx_in_book` | `collection, book_number, num_in_book` | Fast in-book lookups |
| `idx_num_fuad_baqi` | `collection, num_fuad_baqi` | Fuad Abdul Baqi standard lookups |
| `idx_num_arabic` | `collection, num_arabic` | Arabic edition number lookups |

---

## 📚 Collection Mapping

10 collections available in the fawazahmed0 API mapped to their CDN editions:

| OpenBayan Key | CDN Edition | Notes |
|---|---|---|
| `bukhari` | `ara-bukhari` | USC-MSA volume map included |
| `muslim` | `ara-muslim` | Fuad Baqi numbering applied |
| `nasai` | `ara-nasai` | |
| `abudawud` | `ara-abudawud` | |
| `tirmidhi` | `ara-tirmidhi` | |
| `ibnmajah` | `ara-ibnmajah` | Fuad Baqi numbering applied |
| `malik` | `ara-malik` | Fuad Baqi numbering applied |
| `nawawi40` | `ara-nawawi` | Small collection (42 hadiths) |
| `qudsi40` | `ara-qudsi` | Small collection (40 hadiths) |
| `shahwaliullah40` | `ara-dehlawi` | Small collection (40 hadiths) |

---

## 🔧 Technical Implementation

### Key Files

- **Experiment Script**: `notebooks/experiments/enrich_hadith_numbering.py`
- **Prefect Flow**: `notebooks/flows/hadith_numbering_enrichment_flow.py`
- **Schema Migration**: `notebooks/experiments/migrate_hadith_numbering_schema.py`

### Critical Bug Fixed — SurrealQL Float Record ID Parse Error

Some hadith records (e.g. Ibn Majah) have fractional sequential numbers from the fawaz API, creating IDs like `hadith:ibnmajah_3930.2`. SurrealDB's parser treats the `.2` as a decimal and throws:

```
Parse error: Unexpected token `a number`, expected an identifier
  --> [31:29]
   |
31 | UPDATE hadith:ibnmajah_3930.2 SET ...
```

**Fix**: Use SurrealDB's unicode bracket escaping syntax:

```python
# Before (broken)
hadith_id = f"hadith:{collection}_{hadith_num_seq}"

# After (fixed)
hadith_id = f"hadith:⟨{collection}_{hadith_num_seq}⟩"
```

### Batch Ingestion Configuration

| Parameter | Value | Rationale |
|---|---|---|
| `batch_size` | `75` | Reduced from 150 to avoid index-rebuild timeouts |
| `timeout` | `120s` | Raised from 45s for SurrealDB under indexing load |

---

## ✅ Results (2026-05-21)

### Enriched Records — `num_arabic != NONE`

| Collection | Enriched Hadiths |
|---|---|
| Bukhari | 7,277 |
| Muslim | 7,131 |
| Nasai | 5,758 |
| Abu Dawud | 5,274 |
| Tirmidhi | 3,956 |
| Ibn Majah | 4,341 |
| Malik | 1,858 |
| Nawawi 40 | 42 |
| Qudsi 40 | 40 |
| Shah Waliullah 40 | 40 |
| **Total** | **35,717** |

### Enriched Records — `num_fuad_baqi != NONE`

| Collection | Enriched Hadiths |
|---|---|
| Muslim | 7,131 |
| Ibn Majah | 4,341 |
| Malik | 1,858 |
| **Total** | **13,330** |

### Flow Run Summary

```
Flow run 'refreshing-orangutan' — TOTAL UPDATED : 36,390 | TOTAL ERRORS : 0
Alhamdulillah! Flow completed with no errors.
```

### Verification Sample (Bukhari)

```json
{"hadith_number": "1",   "num_arabic": 1,   "num_in_book": 1,  "num_usc_msa": "Vol. 1, Book 1, Hadith 1"}
{"hadith_number": "10",  "num_arabic": 10,  "num_in_book": 3,  "num_usc_msa": "Vol. 1, Book 2, Hadith 3"}
{"hadith_number": "100", "num_arabic": 100, "num_in_book": 42, "num_usc_msa": "Vol. 1, Book 3, Hadith 42"}
```

---

## 📊 Status Summary

- **Status**: ✅ Complete
- **Last Updated**: 2026-05-21
- **Execution Host**: Devserver (`dockerdev` at `100.64.8.38`), container `bayan_jupyter`
- **Database**: `openbayan` namespace, `openbayan` database, SurrealDB at `192.168.100.33:8000`
