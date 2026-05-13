import requests
import json
import time
from typing import List, Dict, Any, Optional
from prefect import flow, task, get_run_logger

# Configuration
# Note: Using the internal IP for SurrealDB as per docker-compose.yml
SURREAL_URL = "http://192.168.100.33:8000/sql"
SURREAL_AUTH = ("root", "RwAbXjBc2z36z")
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
    "Accept": "application/json"
}

API_BASE = "https://api.alquran.cloud/v1"

@task(retries=3, retry_delay_seconds=10)
def get_text_editions() -> List[Dict[str, Any]]:
    """Fetch the list of all text-based editions from the API."""
    logger = get_run_logger()
    logger.info("Fetching available text editions...")
    res = requests.get(f"{API_BASE}/edition/format/text")
    res.raise_for_status()
    data = res.json()["data"]
    logger.info(f"Found {len(data)} text editions.")
    return data

@task(retries=3, retry_delay_seconds=30)
def download_edition(identifier: str) -> Dict[str, Any]:
    """Download the full Quran for a specific edition identifier."""
    logger = get_run_logger()
    logger.info(f"Downloading edition: {identifier}...")
    res = requests.get(f"{API_BASE}/quran/{identifier}")
    res.raise_for_status()
    return res.json()["data"]

@flow(name="Quran Multi-Edition Ingestion")
def ingest_quran_editions_flow(limit_editions: Optional[int] = None):
    logger = get_run_logger()
    
    editions = get_text_editions()
    
    # Priority: Tafsirs first
    tafsirs = [e for e in editions if e["type"] == "tafsir"]
    translations = [e for e in editions if e["type"] == "translation"]
    transliterations = [e for e in editions if e["type"] == "transliteration"]
    
    target_editions = tafsirs + translations + transliterations
    
    if limit_editions:
        target_editions = target_editions[:limit_editions]
        logger.info(f"Limiting to first {limit_editions} editions.")

    for ed in target_editions:
        try:
            full_data = download_edition(ed["identifier"])
            ingest_full_edition_optimized(full_data)
        except Exception as e:
            logger.error(f"Failed to process {ed['identifier']}: {e}")

@task
def ingest_full_edition_optimized(edition_data: Dict[str, Any]):
    """Optimized ingestion using batch queries per Surah."""
    logger = get_run_logger()
    edition_info = edition_data["edition"]
    identifier = edition_info["identifier"]
    etype = edition_info["type"]
    target_field = {"translation": "translations", "tafsir": "tafsir", "transliteration": "transliterations"}.get(etype)
    
    if not target_field:
        logger.warning(f"Unsupported type {etype} for {identifier}")
        return
    
    safe_key = identifier.replace(".", "_")
    
    for surah in edition_data["surahs"]:
        s_num = surah["number"]
        query_parts = []
        for ayah in surah["ayahs"]:
            # Escape single quotes and backslashes
            escaped_text = ayah["text"].replace("\\", "\\\\").replace("'", "\\'")
            q = f"UPDATE ayah SET {target_field}.{safe_key} = '{escaped_text}' WHERE surah_number = {s_num} AND ayah_number = {ayah['numberInSurah']};"
            query_parts.append(q)
        
        full_query = "\n".join(query_parts)
        
        res = requests.post(
            SURREAL_URL,
            auth=SURREAL_AUTH,
            headers=SURREAL_HEADERS,
            data=full_query.encode('utf-8')
        )
        
        if res.status_code != 200:
            logger.error(f"Error surah {s_num} for {identifier}: {res.text}")
            
    logger.info(f"Successfully ingested {identifier}")

if __name__ == "__main__":
    ingest_quran_editions_flow()
