import requests
import json
import os
import re
import unicodedata
import time
from typing import List, Dict, Any, Optional
from prefect import flow, task, get_run_logger
from datasets import load_dataset

# Configuration
SURREAL_URL = "http://192.168.100.33:8000/sql"
SURREAL_AUTH = ("root", "RwAbXjBc2z36z")
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
    "Accept": "application/json"
}

@task(retries=3)
def execute_query(query: str):
    """Execute a SurrealQL query."""
    res = requests.post(
        SURREAL_URL,
        auth=SURREAL_AUTH,
        headers=SURREAL_HEADERS,
        data=query.encode('utf-8')
    )
    if res.status_code != 200:
        print(f"SurrealDB Error: {res.text[:500]}")
    return res.json()

@task
def ingest_hadith_sanadset(batch_size: int = 50, skip_to: int = 0):
    """
    Ingest large hadith sanad dataset from freococo/650k_sanadset
    """
    logger = get_run_logger()
    logger.info(f"Loading 650k_sanadset (starting from index {skip_to})...")
    
    ds = load_dataset("freococo/650k_sanadset", split="train", streaming=True)
    
    queries = []
    count = 0
    
    for row in ds:
        if count < skip_to:
            count += 1
            continue
            
        collection = row.get("Book")
        h_num = row.get("Num_hadith")
        matn = row.get("Matn")
        sanad = row.get("Sanad")
        
        if not all([collection, matn]):
            count += 1
            continue
            
        escaped_matn = str(matn).replace("\\", "\\\\").replace("'", "\\'")
        escaped_sanad = str(sanad).replace("\\", "\\\\").replace("'", "\\'") if sanad else ""
        source_id = "source:hadith_650k_sanadset"
        
        # Better slug: allow Arabic but sanitize for IDs
        coll_slug = re.sub(r'[^\w]', '_', str(collection)).strip('_') or 'unknown'
        
        # Use backticks for safety in record IDs
        record_id = f"hadith:`{coll_slug}_{h_num}`"
        
        q = f"""
        UPSERT {record_id} CONTENT {{
            collection: '{collection}',
            hadith_number: '{h_num}',
            matn_ar: '{escaped_matn}',
            sanad_raw: '{escaped_sanad}',
            source: {source_id},
            raw_dataset_source: '650k_sanadset'
        }};
        """
        queries.append(q)
        
        if len(queries) >= batch_size:
            execute_query("\n".join(queries))
            queries = []
            time.sleep(0.1) # Throttling
            
        count += 1
        if count % 1000 == 0:
            logger.info(f"Progress: {count} total records seen")
                
    if queries:
        execute_query("\n".join(queries))
        
    logger.info("Finished ingesting hadith sanadset.")

@flow(name="Ingest Enhanced HF Quran Knowledge V2")
def ingest_hf_knowledge_flow(skip_hadiths: int = 0):
    """Main flow to orchestrate ingestion of multiple HF datasets."""
    execute_query("""
    UPSERT source:hadith_650k_sanadset CONTENT {
        identifier: 'hadith_650k_sanadset',
        type: 'hadith',
        language: 'ar',
        title: '650k Hadith Sanadset',
        version: '1.0'
    };
    """)
    
    ingest_hadith_sanadset(batch_size=50, skip_to=skip_hadiths)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip", type=int, default=0)
    args = parser.parse_args()
    ingest_hf_knowledge_flow(skip_hadiths=args.skip)
