#!/usr/bin/env python3
"""
Hadith Numbering Enrichment Script
====================================
Enriches the 17 core hadith collections with additional numbering systems:
  - num_in_book   : Position within the chapter/book (Book 1, Hadith N)
  - num_arabic    : Arabic-edition specific number (from fawaz API "arabicnumber")
  - num_usc_msa   : Legacy USC-MSA Vol.Book.Hadith string
  - chapter_number: Numeric chapter index within the book
  - book_name_ar  : Arabic kitab name

Data source: fawazahmed0/hadith-api CDN
  https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/{edition}/{book}.min.json

Run on devserver: python3 enrich_hadith_numbering.py
"""

import os
import json
import time
import requests
from typing import Dict, List, Optional, Any

# ── SurrealDB connection ──────────────────────────────────────────────────────
SURREAL_URL  = os.getenv("SURREALDB_URL", "http://192.168.100.33:8000/sql")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS   = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB   = os.getenv("SURREALDB_DATABASE",  "openbayan")

SURREAL_HEADERS = {
    "surreal-ns": SURREAL_NS,
    "surreal-db": SURREAL_DB,
    "Accept": "application/json",
    "Content-Type": "text/plain",
}

# ── Fawaz CDN base ────────────────────────────────────────────────────────────
FAWAZ_CDN = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions"

# ── 10 Available collections in fawazahmed0 API ────────────────────────────────
CORE_COLLECTIONS = {
    "bukhari":          "ara-bukhari",
    "muslim":           "ara-muslim",
    "nasai":            "ara-nasai",
    "abudawud":         "ara-abudawud",
    "tirmidhi":         "ara-tirmidhi",
    "ibnmajah":         "ara-ibnmajah",
    "malik":            "ara-malik",
    "nawawi40":         "ara-nawawi",
    "qudsi40":          "ara-qudsi",
    "shahwaliullah40":  "ara-dehlawi",
}

# USC-MSA volume mapping (bukhari only — others don't have volumes)
# Format: book_number → volume_number
BUKHARI_VOLUME_MAP = {
    **{str(i): "1" for i in range(1, 9)},     # Books 1-8 → Vol 1
    **{str(i): "2" for i in range(9, 19)},    # Books 9-18 → Vol 2
    **{str(i): "3" for i in range(19, 30)},   # Books 19-29 → Vol 3
    **{str(i): "4" for i in range(30, 44)},   # Books 30-43 → Vol 4
    **{str(i): "5" for i in range(44, 58)},   # Books 44-57 → Vol 5
    **{str(i): "6" for i in range(58, 66)},   # Books 58-65 → Vol 6
    **{str(i): "7" for i in range(66, 80)},   # Books 66-79 → Vol 7
    **{str(i): "8" for i in range(80, 95)},   # Books 80-94 → Vol 8
    **{str(i): "9" for i in range(95, 100)},  # Books 95-99 → Vol 9
}


def execute_sql(sql: str, timeout: int = 60) -> List[Dict]:
    try:
        resp = requests.post(
            SURREAL_URL,
            auth=(SURREAL_USER, SURREAL_PASS),
            headers=SURREAL_HEADERS,
            data=sql.encode("utf-8"),
            timeout=timeout,
        )
        if resp.status_code != 200:
            print(f"  [DB ERROR] HTTP {resp.status_code}: {resp.text[:300]}")
            return []
        return resp.json()
    except Exception as e:
        print(f"  [CONNECTION ERROR] {e}")
        return []


def fetch_fawaz_edition(edition: str) -> Optional[Dict]:
    """
    Fetch all books for a fawaz edition. Returns a dict keyed by book number.
    The CDN has a root metadata file at editions/{edition}.min.json
    """
    meta_url = f"{FAWAZ_CDN}/{edition}.min.json"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    try:
        resp = requests.get(meta_url, headers=headers, timeout=30)
        if resp.status_code == 200:
            return resp.json()
        print(f"  [CDN] metadata not found at {meta_url} (HTTP {resp.status_code})")
    except Exception as e:
        print(f"  [CDN ERROR] {e}")
    return None


def fetch_fawaz_book(edition: str, book_num: int) -> Optional[Dict]:
    """Fetch a specific book from the fawaz CDN."""
    url = f"{FAWAZ_CDN}/{edition}/{book_num}.min.json"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"  [CDN ERROR] Book {book_num}: {e}")
    return None


def build_update_sql(hadith_id: str, updates: Dict[str, Any]) -> str:
    """Build a SurrealDB UPDATE statement for the given hadith."""
    set_parts = []
    for key, val in updates.items():
        if val is None:
            set_parts.append(f"{key} = NONE")
        elif isinstance(val, str):
            escaped = val.replace("'", "\\'")
            set_parts.append(f"{key} = '{escaped}'")
        elif isinstance(val, bool):
            set_parts.append(f"{key} = {'true' if val else 'false'}")
        else:
            set_parts.append(f"{key} = {val}")
    return f"UPDATE {hadith_id} SET {', '.join(set_parts)};"


def enrich_collection(collection: str, edition: str) -> Dict[str, int]:
    stats = {"total": 0, "updated": 0, "skipped": 0, "errors": 0}

    print(f"\n  Fetching metadata for edition: {edition}")
    meta = fetch_fawaz_edition(edition)
    if not meta:
        print(f"  [SKIP] Could not fetch edition metadata for {edition}")
        stats["skipped"] += 1
        return stats

    # The fawaz metadata has: { metadata: { section: { "1": "Book Title", ... } }, hadiths: [...] }
    # OR it may be split per book. Check structure:
    if "hadiths" in meta:
        # Single-file edition (small collections like nawawi40)
        books_data = {1: meta}
    elif "metadata" in meta and "section" in meta.get("metadata", {}):
        # Multi-book edition — need to fetch each book separately
        books_data = {}
        sections = meta["metadata"]["section"]
        print(f"  Found {len(sections)} books/sections")
        for book_num_str in sections.keys():
            book_num = int(book_num_str)
            book_data = fetch_fawaz_book(edition, book_num)
            if book_data:
                books_data[book_num] = book_data
            else:
                print(f"  [WARN] Could not fetch book {book_num}")
            time.sleep(0.1)  # polite rate limiting
    else:
        print(f"  [SKIP] Unknown metadata structure for {edition}")
        return stats

    batch_sqls = []
    batch_size = 75

    def flush_batch():
        nonlocal batch_sqls
        if not batch_sqls:
            return
        sql_block = "\n".join(batch_sqls)
        results = execute_sql(sql_block, timeout=120)
        for r_idx, r in enumerate(results):
            if r.get("status") == "OK":
                stats["updated"] += 1
            else:
                stats["errors"] += 1
                if stats["errors"] <= 5:
                    print(f"  [UPDATE ERROR] batch statement {r_idx+1}: {r}")
        if not results:
            stats["errors"] += len(batch_sqls)
            print(f"  [CONNECTION ERROR] Batch request failed entirely for {len(batch_sqls)} updates")
        batch_sqls = []

    # Now iterate books → chapters → hadiths
    for book_num, book_data in books_data.items():
        book_num_str = str(book_num)
        sections = book_data.get("metadata", {}).get("section", {})
        section_detail = book_data.get("metadata", {}).get("section_detail", {})
        hadiths = book_data.get("hadiths", [])

        if not hadiths:
            continue

        # Build per-chapter ranges for chapter_number assignment
        # section_detail: { "1": { hadithnumber_first: N, hadithnumber_last: M }, ... }
        chapter_ranges = {}
        for ch_num_str, detail in section_detail.items():
            chapter_ranges[ch_num_str] = (
                detail.get("hadithnumber_first", 0),
                detail.get("hadithnumber_last", 0),
            )

        def get_chapter_num(hadith_seq: int) -> Optional[int]:
            for ch_str, (first, last) in chapter_ranges.items():
                if first <= hadith_seq <= last:
                    return int(ch_str)
            return None

        for h in hadiths:
            hadith_num_seq = h.get("hadithnumber")     # global sequential
            arabic_num     = h.get("arabicnumber")     # Arabic-edition number
            ref_book       = h.get("reference", {}).get("book", book_num)
            ref_hadith     = h.get("reference", {}).get("hadith")

            if hadith_num_seq is None:
                continue

            stats["total"] += 1

            # Determine the hadith's OpenBayan ID
            # Escaped with brackets for SurrealQL in case of float keys e.g. hadith:⟨ibnmajah_3930.2⟩
            hadith_id = f"hadith:⟨{collection}_{hadith_num_seq}⟩"

            # Build updates dict
            updates = {}

            if arabic_num is not None:
                updates["num_arabic"] = arabic_num
                if collection in ["muslim", "ibnmajah", "malik"]:
                    updates["num_fuad_baqi"] = arabic_num

            if ref_hadith is not None:
                try:
                    updates["num_in_book"] = int(ref_hadith)
                except (ValueError, TypeError):
                    pass

            if ref_book is not None:
                updates["chapter_number"] = get_chapter_num(hadith_num_seq)

            # Build USC-MSA string for Bukhari (only collection with volumes)
            if collection == "bukhari":
                vol = BUKHARI_VOLUME_MAP.get(book_num_str, "1")
                if ref_hadith:
                    updates["num_usc_msa"] = f"Vol. {vol}, Book {ref_book}, Hadith {ref_hadith}"

            # Book Arabic name
            book_ar_name = sections.get(book_num_str, "")
            if book_ar_name:
                updates["book_name_ar"] = book_ar_name

            if not updates:
                stats["skipped"] += 1
                continue

            sql = build_update_sql(hadith_id, updates)
            batch_sqls.append(sql)
            if len(batch_sqls) >= batch_size:
                flush_batch()

    flush_batch()
    return stats


def main():
    print("Bismillah. Starting Hadith Numbering Enrichment...")
    print("=" * 60)
    print(f"Target: {len(CORE_COLLECTIONS)} core collections")
    print(f"Fields: num_arabic, num_in_book, num_usc_msa, chapter_number, book_name_ar")
    print("=" * 60)

    grand_total   = 0
    grand_updated = 0
    grand_errors  = 0

    for collection, edition in CORE_COLLECTIONS.items():
        print(f"\n[{collection.upper()}] → {edition}")
        stats = enrich_collection(collection, edition)
        grand_total   += stats["total"]
        grand_updated += stats["updated"]
        grand_errors  += stats["errors"]
        print(f"  → Total: {stats['total']} | Updated: {stats['updated']} | Skipped: {stats['skipped']} | Errors: {stats['errors']}")

    print("\n" + "=" * 60)
    print(f"GRAND TOTAL   : {grand_total}")
    print(f"TOTAL UPDATED : {grand_updated}")
    print(f"TOTAL ERRORS  : {grand_errors}")
    if grand_errors == 0:
        print("\nAlhamdulillah! Enrichment completed with no errors.")
    else:
        print(f"\nCompleted with {grand_errors} errors. Check logs above.")


if __name__ == "__main__":
    main()
