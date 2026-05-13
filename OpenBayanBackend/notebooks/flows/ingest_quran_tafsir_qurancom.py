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

API_BASE = "https://api.quran.com/api/v4/tafsirs"

# Tafsir IDs from quran.com
TAFSIR_IDS = {
    "ar_saddi": 91,
    "ar_mukhtasar": 171
}

@task(retries=3, retry_delay_seconds=10)
def fetch_tafsir_chapter(tafsir_id: int, chapter_number: int) -> List[Dict[str, Any]]:
    """Fetch all tafsirs for a chapter from quran.com."""
    logger = get_run_logger()
    url = f"{API_BASE}/{tafsir_id}/by_chapter/{chapter_number}"
    res = requests.get(url)
    res.raise_for_status()
    return res.json()["tafsirs"]

@task(retries=3)
def update_ayah_tafsir(tafsir_key: str, chapter_number: int, tafsirs: List[Dict[str, Any]]):
    """Update tafsir for ayahs in a chapter."""
    logger = get_run_logger()
    query_parts = []
    
    for item in tafsirs:
        # verse_key is "surah:ayah"
        vkey = item["verse_key"]
        s_num, a_num = map(int, vkey.split(":"))
        
        # Escape text (contains HTML tags usually from quran.com)
        escaped_text = item["text"].replace("\\", "\\\\").replace("'", "\\'")
        
        q = f"UPDATE ayah SET tafsir.{tafsir_key} = '{escaped_text}' WHERE surah_number = {s_num} AND ayah_number = {a_num};"
        query_parts.append(q)
        
    full_query = "\n".join(query_parts)
    
    res = requests.post(
        SURREAL_URL,
        auth=SURREAL_AUTH,
        headers=SURREAL_HEADERS,
        data=full_query.encode('utf-8')
    )
    
    if res.status_code != 200:
        logger.error(f"Failed to update Surah {chapter_number} for {tafsir_key}: {res.text}")
    else:
        logger.info(f"Successfully updated Surah {chapter_number} for {tafsir_key}")

@flow(name="Ingest Quran.com Tafsirs")
def ingest_qurancom_tafsirs_flow(limit_surahs: Optional[int] = None):
    logger = get_run_logger()
    
    for key, tid in TAFSIR_IDS.items():
        logger.info(f"Processing Tafsir: {key} (ID: {tid})")
        
        end_surah = limit_surahs if limit_surahs else 114
        
        for s_num in range(1, end_surah + 1):
            try:
                tafsir_data = fetch_tafsir_chapter(tid, s_num)
                update_ayah_tafsir(key, s_num, tafsir_data)
                # Polite delay for quran.com API
                time.sleep(0.5)
            except Exception as e:
                logger.error(f"Error surah {s_num} for {key}: {e}")

if __name__ == "__main__":
    ingest_qurancom_tafsirs_flow()
