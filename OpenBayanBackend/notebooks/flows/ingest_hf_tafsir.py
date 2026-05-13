import requests
import json
import os
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
HF_DATASET_NAME = "Mrking1/Quran-Tafseer"

@task(retries=3)
def update_tafsir_batch(tafseer_slug: str, batch: List[Dict[str, Any]]):
    """Update a batch of ayahs with a specific tafsir."""
    logger = get_run_logger()
    query_parts = []
    
    for row in batch:
        # Normalize fields
        s_num = row.get("surah") or row.get("chapter") or row.get("surah_id")
        a_num = row.get("ayah") or row.get("verse") or row.get("ayah_id")
        text = row.get("text") or row.get("tafsir_text")
        
        if not all([s_num, a_num, text]):
            continue
            
        escaped_text = str(text).replace("\\", "\\\\").replace("'", "\\'")
        
        # Update specifically the tafsir object for this slug
        q = f"UPDATE ayah SET tafsir.{tafseer_slug} = '{escaped_text}' WHERE surah_number = {s_num} AND ayah_number = {a_num};"
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
        logger.error(f"Failed to update batch for {tafseer_slug}: {res.text[:200]}")

@flow(name="Ingest Hugging Face Multi-Tafseer")
def ingest_hf_tafsir_flow(tafseer_name: Optional[str] = None):
    """
    Ingests tafsirs from Hugging Face. 
    If tafseer_name is provided, it ingests only that specific one.
    """
    logger = get_run_logger()
    logger.info(f"Loading dataset: {HF_DATASET_NAME}")
    
    # Load the dataset
    # Some datasets have multiple configurations (one per tafsir)
    try:
        ds = load_dataset(HF_DATASET_NAME, tafseer_name) if tafseer_name else load_dataset(HF_DATASET_NAME)
        
        # The dataset might be a DatasetDict or a Dataset
        if hasattr(ds, "keys"):
            for split in ds.keys():
                logger.info(f"Processing split: {split}")
                data = ds[split]
                
                # Determine slug from split or config
                slug = tafseer_name if tafseer_name else split
                
                batch = []
                for row in data:
                    batch.append(row)
                    if len(batch) >= 50:
                        update_tafsir_batch(slug, batch)
                        batch = []
                
                if batch:
                    update_tafsir_batch(slug, batch)
        else:
            # Single dataset
            slug = tafseer_name or "default_tafsir"
            batch = []
            for row in ds:
                batch.append(row)
                if len(batch) >= 50:
                    update_tafsir_batch(slug, batch)
                    batch = []
            if batch:
                update_tafsir_batch(slug, batch)
                
    except Exception as e:
        logger.error(f"Error loading or processing dataset: {e}")

if __name__ == "__main__":
    # Example: Run for a specific tafsir or all available
    ingest_hf_tafsir_flow()
