"""
Prefect Flow: Hadith Numbering Enrichment
==========================================
Wraps enrich_hadith_numbering.py as a production Prefect flow.
Run on the devserver via the bayan-ingestion-pool work pool.

Usage:
    python3 hadith_numbering_enrichment_flow.py
"""

import os
import sys
import time
import json
import requests
from typing import Optional, Dict, List, Any

from prefect import flow, task, get_run_logger



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

BUKHARI_VOLUME_MAP = {
    **{str(i): "1" for i in range(1, 9)},
    **{str(i): "2" for i in range(9, 19)},
    **{str(i): "3" for i in range(19, 30)},
    **{str(i): "4" for i in range(30, 44)},
    **{str(i): "5" for i in range(44, 58)},
    **{str(i): "6" for i in range(58, 66)},
    **{str(i): "7" for i in range(66, 80)},
    **{str(i): "8" for i in range(80, 95)},
    **{str(i): "9" for i in range(95, 100)},
}


def execute_sql(sql: str, timeout: int = 30) -> List[Dict]:
    try:
        resp = requests.post(
            SURREAL_URL,
            auth=(SURREAL_USER, SURREAL_PASS),
            headers=SURREAL_HEADERS,
            data=sql.encode("utf-8"),
            timeout=timeout,
        )
        if resp.status_code != 200:
            print(f"HTTP Error {resp.status_code}: {resp.text[:500]}")
            return []
        return resp.json()
    except Exception as e:
        print(f"Exception executing SQL: {e}")
        return []


def build_update_sql(hadith_id: str, updates: Dict[str, Any]) -> str:
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


@task(name="apply-schema-migration", retries=2)
def apply_schema_migration() -> bool:
    logger = get_run_logger()
    logger.info("Applying SurrealDB schema migration...")

    migration_sql = """
DEFINE FIELD num_in_book ON hadith TYPE none | int PERMISSIONS FULL;
DEFINE FIELD num_arabic ON hadith TYPE none | number | string PERMISSIONS FULL;
DEFINE FIELD num_fuad_baqi ON hadith TYPE none | number | string PERMISSIONS FULL;
DEFINE FIELD num_usc_msa ON hadith TYPE none | string PERMISSIONS FULL;
DEFINE FIELD chapter_number ON hadith TYPE none | int PERMISSIONS FULL;
DEFINE FIELD book_name_ar ON hadith TYPE none | string PERMISSIONS FULL;
DEFINE INDEX idx_in_book ON hadith FIELDS collection, book_number, num_in_book;
DEFINE INDEX idx_num_fuad_baqi ON hadith FIELDS collection, num_fuad_baqi;
DEFINE INDEX idx_num_arabic ON hadith FIELDS collection, num_arabic;
"""
    results = execute_sql(migration_sql, timeout=300)
    errors = [r for r in results if r.get("status") != "OK"]
    if errors:
        logger.warning(f"Schema migration had {len(errors)} non-OK results (may be safe if fields already exist)")
    else:
        logger.info("Schema migration applied successfully.")
    return True


@task(name="fetch-fawaz-edition", retries=3, retry_delay_seconds=5)
def fetch_fawaz_edition_meta(edition: str) -> Optional[Dict]:
    logger = get_run_logger()
    url = f"{FAWAZ_CDN}/{edition}.min.json"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    logger.info(f"Fetching: {url}")
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            return resp.json()
        logger.warning(f"HTTP {resp.status_code} for {url}")
    except Exception as e:
        logger.error(f"Error fetching {url}: {e}")
    return None


@task(name="fetch-fawaz-book", retries=3, retry_delay_seconds=5)
def fetch_fawaz_book(edition: str, book_num: int) -> Optional[Dict]:
    logger = get_run_logger()
    url = f"{FAWAZ_CDN}/{edition}/{book_num}.min.json"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"}
    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        logger.warning(f"Error fetching book {book_num}: {e}")
    return None


@task(name="enrich-collection", retries=1)
def enrich_collection_task(collection: str, edition: str) -> Dict[str, int]:
    logger = get_run_logger()
    stats = {"total": 0, "updated": 0, "skipped": 0, "errors": 0}

    meta = fetch_fawaz_edition_meta.fn(edition)
    if not meta:
        logger.warning(f"No metadata for {edition}, skipping.")
        return stats

    if "hadiths" in meta:
        books_data = {1: meta}
    elif "metadata" in meta and "section" in meta.get("metadata", {}):
        books_data = {}
        sections = meta["metadata"]["section"]
        logger.info(f"  {collection}: fetching {len(sections)} books from CDN")
        for book_num_str in sections.keys():
            book_num = int(book_num_str)
            book_data = fetch_fawaz_book.fn(edition, book_num)
            if book_data:
                books_data[book_num] = book_data
            time.sleep(0.15)
    else:
        logger.warning(f"Unknown CDN structure for {edition}")
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
                if stats["errors"] <= 3:
                    logger.warning(f"Update failed in batch statement {r_idx+1}: {r}")
        if not results:
            stats["errors"] += len(batch_sqls)
            logger.error(f"Batch request failed entirely for {len(batch_sqls)} updates")
        batch_sqls = []

    for book_num, book_data in books_data.items():
        book_num_str = str(book_num)
        sections     = book_data.get("metadata", {}).get("section", {})
        sec_detail   = book_data.get("metadata", {}).get("section_detail", {})
        hadiths      = book_data.get("hadiths", [])

        chapter_ranges = {
            ch_str: (d.get("hadithnumber_first", 0), d.get("hadithnumber_last", 0))
            for ch_str, d in sec_detail.items()
        }

        def get_chapter_num(seq: int) -> Optional[int]:
            for ch_str, (first, last) in chapter_ranges.items():
                if first <= seq <= last:
                    return int(ch_str)
            return None

        for h in hadiths:
            hadith_num_seq = h.get("hadithnumber")
            arabic_num     = h.get("arabicnumber")
            ref_book       = h.get("reference", {}).get("book", book_num)
            ref_hadith     = h.get("reference", {}).get("hadith")

            if hadith_num_seq is None:
                continue

            stats["total"] += 1
            # Escaped with brackets for SurrealQL in case of float keys e.g. hadith:⟨ibnmajah_3930.2⟩
            hadith_id = f"hadith:⟨{collection}_{hadith_num_seq}⟩"
            updates   = {}

            if arabic_num is not None:
                updates["num_arabic"] = arabic_num
                if collection in ["muslim", "ibnmajah", "malik"]:
                    updates["num_fuad_baqi"] = arabic_num
            if ref_hadith is not None:
                try:
                    updates["num_in_book"] = int(ref_hadith)
                except (ValueError, TypeError):
                    pass
                updates["chapter_number"] = get_chapter_num(hadith_num_seq)

            if collection == "bukhari":
                vol = BUKHARI_VOLUME_MAP.get(book_num_str, "1")
                if ref_hadith:
                    updates["num_usc_msa"] = f"Vol. {vol}, Book {ref_book}, Hadith {ref_hadith}"

            book_ar = sections.get(book_num_str, "")
            if book_ar:
                updates["book_name_ar"] = book_ar

            if not updates:
                stats["skipped"] += 1
                continue

            sql    = build_update_sql(hadith_id, updates)
            batch_sqls.append(sql)
            if len(batch_sqls) >= batch_size:
                flush_batch()

    flush_batch()
    logger.info(
        f"[{collection}] total={stats['total']} updated={stats['updated']} "
        f"skipped={stats['skipped']} errors={stats['errors']}"
    )
    return stats


@task(name="verify-enrichment")
def verify_enrichment() -> bool:
    logger = get_run_logger()
    check_sql = """
SELECT id, hadith_number, num_arabic, num_in_book, num_usc_msa, chapter_number, book_name_ar
FROM hadith
WHERE collection = 'bukhari' AND hadith_number IN ['1', '10', '100']
LIMIT 5;
"""
    results = execute_sql(check_sql, timeout=30)
    if results and results[0].get("status") == "OK":
        rows = results[0]["result"]
        logger.info(f"Verification sample (Bukhari):")
        for row in rows:
            logger.info(json.dumps({k: v for k, v in row.items() if k != "id"}, ensure_ascii=False))
        return True
    logger.error("Verification query failed!")
    return False


@flow(
    name="hadith-numbering-enrichment",
    description="Enriches 17 core hadith collections with multiple numbering systems from fawazahmed0 API",
)
def hadith_numbering_enrichment_flow(
    collections: Optional[List[str]] = None,
    skip_migration: bool = False,
):
    logger = get_run_logger()
    logger.info("Bismillah. Starting Hadith Numbering Enrichment Flow")

    if not skip_migration:
        apply_schema_migration()

    target = collections or list(CORE_COLLECTIONS.keys())
    logger.info(f"Processing {len(target)} collections: {target}")

    all_stats = {}
    for coll in target:
        edition = CORE_COLLECTIONS.get(coll)
        if not edition:
            logger.warning(f"No edition mapping for collection '{coll}', skipping.")
            continue
        stats = enrich_collection_task(coll, edition)
        all_stats[coll] = stats

    verify_enrichment()

    grand_updated = sum(s["updated"] for s in all_stats.values())
    grand_errors  = sum(s["errors"]  for s in all_stats.values())
    logger.info(f"\n{'='*50}")
    logger.info(f"TOTAL UPDATED : {grand_updated}")
    logger.info(f"TOTAL ERRORS  : {grand_errors}")

    if grand_errors == 0:
        logger.info("Alhamdulillah! Flow completed with no errors.")
    else:
        logger.warning(f"Flow completed with {grand_errors} errors.")

    return all_stats


if __name__ == "__main__":
    # Allow running specific collections via CLI args, e.g.:
    #   python3 hadith_numbering_enrichment_flow.py bukhari muslim
    import sys
    target_collections = sys.argv[1:] if len(sys.argv) > 1 else None
    hadith_numbering_enrichment_flow(collections=target_collections)
