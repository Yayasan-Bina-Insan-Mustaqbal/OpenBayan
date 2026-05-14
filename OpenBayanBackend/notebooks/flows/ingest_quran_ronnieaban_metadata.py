import csv
import requests
import json
import re
import time
from typing import List, Dict, Any, Optional
from prefect import flow, task, get_run_logger

# Configuration
SURREAL_URL = "http://192.168.100.33:8000/sql"
SURREAL_AUTH = ("root", "RwAbXjBc2z36z")
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
    "Accept": "application/json"
}

import os
CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ronnieaban_quran.csv")

@task(retries=3)
def upsert_theme_category(label: str):
    """Ensure the theme group exists as a category."""
    if not label or label.strip() == "":
        return
    
    query = f"UPSERT category SET label = '{label}', classification = 'theme' WHERE label = '{label}';"
    requests.post(SURREAL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=query)

@task(retries=3)
def update_ayah_metadata_batch(rows: List[Dict[str, Any]]):
    """Update ayah records with Ronnie Aban metadata in a batch."""
    logger = get_run_logger()
    query_parts = []
    
    for row in rows:
        s_num = int(row["surah_id"])
        a_num = int(row["ayah"])
        
        # Metadata fields
        metadata_update = {
            "munasabah_prev_surah": row["tafsir_munasabah_prev_surah"],
            "munasabah_prev_theme": row["tafsir_munasabah_prev_theme"],
            "theme_group": row["tafsir_theme_group"],
            "kosakata": row["tafsir_kosakata"],
            "conclusion": row["tafsir_conclusion"],
            "sabab_nuzul": row["tafsir_sabab_nuzul"],
            "intro_surah": row["tafsir_intro_surah"]
        }
        
        # Clean metadata from empty strings
        metadata_update = {k: v for k, v in metadata_update.items() if v and v.strip()}
        
        # Tafsir fields
        tafsir_update = {
            "id_wajiz": row["tafsir_wajiz"],
            "id_tahlili": row["tafsir_tahlili"]
        }
        
        # Construct SurrealDB update query
        # Use += to merge objects, and json.dumps() to provide a valid SurrealQL object
        meta_json = json.dumps(metadata_update)
        tafsir_json = json.dumps(tafsir_update)
        
        q = f"UPDATE ayah SET metadata += {meta_json}, tafsir += {tafsir_json} WHERE surah_number = {s_num} AND ayah_number = {a_num};"
        query_parts.append(q)
        
        # Relationship to theme group
        theme = row["tafsir_theme_group"]
        if theme and theme.strip():
            # Slug: ASCII-only alnum + underscore, no apostrophes or spaces
            theme_slug = re.sub(r"[^a-z0-9]+", "_", theme.lower()).strip("_") or "unknown"
            cat_id = f"theme_{theme_slug}"
            # Escape theme label for SurrealQL string
            escaped_theme = theme.replace("\\", "\\\\").replace("'", "\\'")
            rel_q = f"UPSERT category:{cat_id} SET label = '{escaped_theme}', classification = 'theme'; "
            rel_q += f"RELATE (SELECT id FROM ayah WHERE surah_number = {s_num} AND ayah_number = {a_num} LIMIT 1)->classified_as->category:{cat_id} SET weight = 10, source = 'ronnieaban';"
            query_parts.append(rel_q)

    if not query_parts:
        return

    full_query = "\n".join(query_parts)
    
    res = requests.post(
        SURREAL_URL,
        auth=SURREAL_AUTH,
        headers=SURREAL_HEADERS,
        data=full_query.encode('utf-8')
    )
    
    if res.status_code != 200:
        logger.error(f"Failed batch update: {res.text[:500]}")
    else:
        # Check for errors in the multi-statement response
        try:
            results = res.json()
            for r in results:
                if r.get("status") == "ERR":
                    logger.error(f"SurrealDB Error in batch: {r.get('result')}")
                    # In a real scenario we might want to raise here, 
                    # but for now we log so we can see which records fail.
        except:
            pass
        logger.info(f"Successfully processed batch of {len(rows)} ayahs")

@flow(name="Ingest Ronnie Aban Quran Metadata")
def ingest_ronnieaban_flow():
    logger = get_run_logger()
    logger.info("Starting Ronnie Aban metadata ingestion")
    
    # Using the local file path inside Docker (we will scp it there)
    try:
        with open(CSV_PATH, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            batch = []
            for row in reader:
                batch.append(row)
                if len(batch) >= 20:
                    update_ayah_metadata_batch(batch)
                    batch = []
            
            if batch:
                update_ayah_metadata_batch(batch)
    except FileNotFoundError:
        logger.error("CSV file not found. Make sure it is at the correct path in the container.")

if __name__ == "__main__":
    ingest_ronnieaban_flow()
