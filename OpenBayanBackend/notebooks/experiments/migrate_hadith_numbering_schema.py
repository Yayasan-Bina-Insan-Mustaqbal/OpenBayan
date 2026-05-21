#!/usr/bin/env python3
"""
Schema migration: Add multiple hadith numbering fields to the hadith table.
Run this on the devserver.
"""
import requests
import os

SURREAL_URL = os.getenv("SURREALDB_URL", "http://192.168.100.33:8000/sql")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS   = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB   = os.getenv("SURREALDB_DATABASE",  "openbayan")

HEADERS = {
    "surreal-ns": SURREAL_NS,
    "surreal-db": SURREAL_DB,
    "Accept": "application/json",
    "Content-Type": "text/plain",
}

MIGRATION_SQL = """
-- ================================================================
-- Migration: Hadith Multiple Numbering Systems
-- Date: 2026-05-21
-- Purpose: Add parallel numbering fields for cross-referencing
--          across different scholarly and digital publications.
-- ================================================================

-- Drop existing definitions to allow clean type redefinition
REMOVE FIELD num_in_book ON TABLE hadith;
REMOVE FIELD num_arabic ON TABLE hadith;
REMOVE FIELD num_fuad_baqi ON TABLE hadith;
REMOVE FIELD num_usc_msa ON TABLE hadith;
REMOVE FIELD chapter_number ON TABLE hadith;
REMOVE FIELD book_name_ar ON TABLE hadith;

REMOVE INDEX idx_in_book ON TABLE hadith;
REMOVE INDEX idx_num_fuad_baqi ON TABLE hadith;
REMOVE INDEX idx_num_arabic ON TABLE hadith;

-- num_in_book: Sequential number within the specific book/kitab
-- (resets at each book boundary, same as "Book 1, Hadith 5" format)
DEFINE FIELD num_in_book ON hadith TYPE none | int PERMISSIONS FULL;

-- num_arabic: Number used in the authoritative Arabic printed edition
-- (from fawazahmed0/hadith-api "arabicnumber" field)
-- May differ from hadith_number for some books due to mukarrar treatment.
DEFINE FIELD num_arabic ON hadith TYPE none | number | string PERMISSIONS FULL;

-- num_fuad_baqi: Muhammad Fuad Abdul Baqi academic numbering
-- Standard used at Islamic universities; primary reference for
-- Sahih Muslim, Sunan Ibn Majah, Muwatta Malik.
-- For Bukhari: ranges 1-7563.
DEFINE FIELD num_fuad_baqi ON hadith TYPE none | number | string PERMISSIONS FULL;

-- num_usc_msa: Legacy USC-MSA web reference string
-- Format: "Vol. {v}, Book {b}, Hadith {h}" (deprecated by Sunnah.com
-- but still widely referenced in old academic papers and websites).
DEFINE FIELD num_usc_msa ON hadith TYPE none | string PERMISSIONS FULL;

-- chapter_number: Numeric index of the chapter (bab) within its book (kitab)
-- Complements the existing chapter_title string field.
DEFINE FIELD chapter_number ON hadith TYPE none | int PERMISSIONS FULL;

-- book_name_ar: Arabic name of the kitab (book section)
DEFINE FIELD book_name_ar ON hadith TYPE none | string PERMISSIONS FULL;

-- ================================================================
-- Indexes for cross-referencing queries
-- ================================================================

-- For in-book lookups: "Book 1, Hadith 5"
DEFINE INDEX idx_in_book ON hadith FIELDS collection, book_number, num_in_book;

-- For Fuad Baqi standard lookups
DEFINE INDEX idx_num_fuad_baqi ON hadith FIELDS collection, num_fuad_baqi;

-- For Arabic number lookups  
DEFINE INDEX idx_num_arabic ON hadith FIELDS collection, num_arabic;
"""

def run_migration():
    print("Bismillah. Running hadith numbering schema migration...")
    
    resp = requests.post(
        SURREAL_URL,
        auth=(SURREAL_USER, SURREAL_PASS),
        headers=HEADERS,
        data=MIGRATION_SQL.encode("utf-8"),
        timeout=300,
    )
    
    if resp.status_code != 200:
        print(f"HTTP Error {resp.status_code}: {resp.text}")
        return False

    results = resp.json()
    errors = []
    for i, r in enumerate(results):
        status = r.get("status", "UNKNOWN")
        if status != "OK":
            errors.append(f"Statement {i+1}: {status} — {r.get('result', '')}")
        else:
            print(f"  ✓ Statement {i+1}: OK")

    if errors:
        print("\nErrors encountered:")
        for e in errors:
            print(f"  ✗ {e}")
        return False

    print("\nAlhamdulillah! Schema migration completed successfully.")
    return True

if __name__ == "__main__":
    run_migration()
