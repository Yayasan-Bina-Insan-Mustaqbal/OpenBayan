import requests
import json
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

# Source Dataset
HF_DATASET_NAME = "ImruQays/Quran-Classical-Arabic-English-Parallel-texts"

@task(retries=3)
def update_translation_batch(trans_key: str, batch: List[Dict[str, Any]]):
    """Update a batch of ayahs with a specific translation."""
    logger = get_run_logger()
    query_parts = []
    
    for row in batch:
        s_num = row.get("surah_id")
        a_num = row.get("verse_id")
        text = row.get("translation_text") or row.get("text")
        
        if not all([s_num, a_num, text]):
            continue
            
        escaped_text = str(text).replace("\\", "\\\\").replace("'", "\\'")
        
        # Update the translations object in the ayah table
        q = f"UPDATE ayah SET translations.{trans_key} = '{escaped_text}' WHERE surah_number = {s_num} AND ayah_number = {a_num};"
        query_parts.append(q)
        
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
        logger.error(f"Failed to update batch for {trans_key}: {res.text[:200]}")

@flow(name="Ingest Quran Parallel Translations")
def ingest_parallel_translations_flow():
    logger = get_run_logger()
    logger.info(f"Loading parallel translations from {HF_DATASET_NAME}")
    
    try:
        # Load the dataset (usually has multiple configurations for different translations)
        # For ImruQays, we might need to iterate through configurations
        configs = ["arberry", "asad", "pickthall", "yusufali", "sahih"] # Example keys
        
        for cfg in configs:
            logger.info(f"Processing translation: {cfg}")
            try:
                ds = load_dataset(HF_DATASET_NAME, cfg, split="train")
                
                batch = []
                for row in ds:
                    batch.append(row)
                    if len(batch) >= 100:
                        update_translation_batch(cfg, batch)
                        batch = []
                
                if batch:
                    update_translation_batch(cfg, batch)
            except Exception as inner_e:
                logger.warning(f"Config {cfg} not found or failed: {inner_e}")
                
    except Exception as e:
        logger.error(f"Main flow error: {e}")

if __name__ == "__main__":
    ingest_parallel_translations_flow()
