import pandas as pd
import requests
import json
import os
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

# Local path inside the devserver container
KAGGLE_CSV_PATH = "/root/projects/OpenBayan-KG/OpenBayanBackend/data/quranic_thematic_emotional.csv"

@task(retries=3)
def process_thematic_row(row: pd.Series):
    """Process a single row from the thematic dataset and update SurrealDB."""
    logger = get_run_logger()
    
    # Standardize identifiers (Mapping might vary, usually surah_no and ayah_no)
    try:
        s_num = int(row.get("Surah", 0))
        a_num = int(row.get("Ayah", 0))
        if s_num == 0 or a_num == 0:
            return

        # Metadata to merge
        metadata_update = {
            "emotion": row.get("Emotion", ""),
            "sentiment": row.get("Sentiment", ""),
            "sabab_nuzul_alt": row.get("Sabab Nuzul", ""),
            "thematic_subgroup": row.get("Thematic Subgroup", "")
        }
        
        # Clean metadata
        metadata_update = {k: v for k, v in metadata_update.items() if v and str(v).lower() != 'nan'}
        
        if not metadata_update:
            return

        meta_json = json.dumps(metadata_update).replace("\\", "\\\\").replace("'", "\\'")
        
        # 1. Update Ayah Metadata
        query = f"UPDATE ayah SET metadata = metadata || {meta_json} WHERE surah_number = {s_num} AND ayah_number = {a_num};"
        
        # 2. Handle Thematic Grouping (Categorization)
        theme = row.get("Thematic Group", "")
        if theme and str(theme).lower() != 'nan':
            cat_id = f"category:theme_{str(theme).lower().strip().replace(' ', '_')}"
            query += f"\nUPSERT {cat_id} SET label = '{theme}', classification = 'theme'; "
            query += f"\nRELATE (SELECT id FROM ayah WHERE surah_number = {s_num} AND ayah_number = {a_num})->classified_as->{cat_id} SET source = 'nabeelqureshitiii', weight = 0.8;"

        res = requests.post(
            SURREAL_URL,
            auth=SURREAL_AUTH,
            headers=SURREAL_HEADERS,
            data=query.encode('utf-8')
        )
        
        if res.status_code != 200:
            logger.error(f"Failed to update Ayah {s_num}:{a_num}: {res.text}")
            
    except Exception as e:
        logger.error(f"Error processing row: {e}")

@flow(name="Ingest Thematic & Emotional Annotations")
def ingest_thematic_emotional_flow(csv_path: str = KAGGLE_CSV_PATH):
    logger = get_run_logger()
    logger.info(f"Starting ingestion from {csv_path}")
    
    if not os.path.exists(csv_path):
        logger.error(f"File not found: {csv_path}")
        return

    df = pd.read_csv(csv_path)
    logger.info(f"Loaded {len(df)} rows of thematic data")
    
    # Process in batches for performance
    for _, row in df.iterrows():
        process_thematic_row(row)

if __name__ == "__main__":
    ingest_thematic_emotional_flow()
