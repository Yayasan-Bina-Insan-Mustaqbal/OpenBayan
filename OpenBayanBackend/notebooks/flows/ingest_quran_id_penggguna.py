import requests
import json
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

BASE_URL = "https://raw.githubusercontent.com/penggguna/QuranJSON/master/surah/{}.json"

@task(retries=3, retry_delay_seconds=5)
def fetch_surah_json(surah_number: int) -> Dict[str, Any]:
    """Fetch Surah JSON from the GitHub repository."""
    logger = get_run_logger()
    url = BASE_URL.format(surah_number)
    res = requests.get(url)
    res.raise_for_status()
    return res.json()

@task(retries=3)
def update_ayah_translations(surah_number: int, verses: List[Dict[str, Any]]):
    """Update Indonesian translations for a specific Surah in SurrealDB."""
    logger = get_run_logger()
    query_parts = []
    
    # We'll use 'id_quranjson' as the identifier for this specific translation
    safe_key = "id_quranjson"
    
    for verse in verses:
        ayah_num = verse["number"]
        text_id = verse["translation_id"].replace("\\", "\\\\").replace("'", "\\'")
        
        # Update the translations object in the ayah table
        q = f"UPDATE ayah SET translations.{safe_key} = '{text_id}' WHERE surah_number = {surah_number} AND ayah_number = {ayah_num};"
        query_parts.append(q)
        
    full_query = "\n".join(query_parts)
    
    res = requests.post(
        SURREAL_URL,
        auth=SURREAL_AUTH,
        headers=SURREAL_HEADERS,
        data=full_query.encode('utf-8')
    )
    
    if res.status_code != 200:
        logger.error(f"Failed to update Surah {surah_number}: {res.text}")
    else:
        logger.info(f"Successfully updated Surah {surah_number} ({len(verses)} ayahs)")

@flow(name="Ingest Indonesian Quran (QuranJSON)")
def ingest_id_quran_flow(start_surah: int = 1, end_surah: int = 114):
    logger = get_run_logger()
    logger.info(f"Starting Indonesian translation ingestion from Surah {start_surah} to {end_surah}")
    
    for s_num in range(start_surah, end_surah + 1):
        try:
            data = fetch_surah_json(s_num)
            update_ayah_translations(s_num, data["verses"])
        except Exception as e:
            logger.error(f"Error processing Surah {s_num}: {e}")
            
if __name__ == "__main__":
    ingest_id_quran_flow()
