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
        # Load the dataset (all translations are in columns of the 'train' split)
        ds = load_dataset(HF_DATASET_NAME, split="train")
        
        # Translation columns to ingest
        trans_cols = [
            'en-ahmedali', 'en-ahmedraza', 'en-arberry', 'en-asad', 
            'en-daryabadi', 'en-hilali', 'en-itani', 'en-maududi', 
            'en-mubarakpuri', 'en-pickthall', 'en-qarai', 'en-qaribullah', 
            'en-sahih', 'en-sarwar', 'en-shakir', 'en-wahiduddi', 'en-yusufali'
        ]
        
        for col in trans_cols:
            if col not in ds.column_names:
                logger.warning(f"Column {col} not found in dataset")
                continue
                
            logger.info(f"Processing translation column: {col}")
            
            batch = []
            # For each row, we need the surah/ayah info. 
            # ImruQays typically has row indices or similar. 
            # We'll assume the row index + 1 is the sequence if not provided, 
            # but usually Quran datasets follow the 6236 sequence.
            # Let's check if it has surah/ayah IDs.
            
        # Ayah counts per surah (1-114)
        ayah_counts = [
            7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111, 110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45, 83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55, 78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20, 56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21, 11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6
        ]
        
        # Build a mapping list of (surah, ayah)
        mapping = []
        for s_idx, count in enumerate(ayah_counts):
            for a_idx in range(1, count + 1):
                mapping.append((s_idx + 1, a_idx))
        
        for col in trans_cols:
            if col not in ds.column_names:
                logger.warning(f"Column {col} not found in dataset")
                continue
                
            logger.info(f"Processing translation column: {col}")
            
            batch = []
            for i, row in enumerate(ds):
                if i >= len(mapping):
                    break
                    
                s_num, a_num = mapping[i]
                text = row.get(col)
                
                if not text:
                    continue
                
                batch.append({
                    "surah_id": s_num, 
                    "verse_id": a_num, 
                    "translation_text": text
                })
                
                if len(batch) >= 100:
                    update_translation_batch(col.replace("en-", ""), batch)
                    batch = []
            
            if batch:
                update_translation_batch(col.replace("en-", ""), batch)
                
    except Exception as e:
        logger.error(f"Main flow error: {e}")

if __name__ == "__main__":
    ingest_parallel_translations_flow()
