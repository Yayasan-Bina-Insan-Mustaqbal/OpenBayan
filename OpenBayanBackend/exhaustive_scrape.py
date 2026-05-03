import requests
import json
import time
from typing import List, Dict, Any
from surrealdb import Surreal
from prefect import flow, task, get_run_logger

# Configuration
SURREAL_URL = "ws://surrealdb:8000/rpc"
BASE_EDITIONS = ["quran-uthmani", "quran-simple-clean"]

def load_editions():
    with open("all_editions.txt", "r") as f:
        return [line.strip() for line in f if line.strip()]

@task(retries=5, retry_delay_seconds=15)
def fetch_surah_batch(surah_number: int, editions: List[str]) -> List[Dict[str, Any]]:
    logger = get_run_logger()
    editions_str = ",".join(editions)
    url = f"https://api.alquran.cloud/v1/surah/{surah_number}/editions/{editions_str}"
    
    logger.info(f"Fetching Surah {surah_number} batch: {len(editions)} editions")
    res = requests.get(url, timeout=300) # Increased timeout for large batches
    res.raise_for_status()
    data = res.json()["data"]
    
    num_ayahs = len(data[0]["ayahs"])
    ayahs_batch = []
    
    for i in range(num_ayahs):
        ayah_data = {"surah_number": surah_number, "ayah_number": data[0]["ayahs"][i]["numberInSurah"]}
        for idx, edition_data in enumerate(data):
            identifier = editions[idx]
            text = edition_data["ayahs"][i]["text"]
            
            # Use identifier as key for flexibility, replacing dots with underscores for SurrealDB
            key = identifier.replace(".", "_").replace("-", "_")
            ayah_data[key] = text
            
            # Map standard metadata only once
            if idx == 0:
                ayah_data["juz"] = edition_data["ayahs"][i]["juz"]
                ayah_data["hizb_quarter"] = edition_data["ayahs"][i]["hizbQuarter"]
                ayah_data["page"] = edition_data["ayahs"][i]["page"]
                
        ayahs_batch.append(ayah_data)
    return ayahs_batch

@task
def save_ayah_data_to_db(ayahs_batches: List[List[Dict[str, Any]]]):
    logger = get_run_logger()
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        
        # ayahs_batches is a list of batches (each batch is 1 surah for some editions)
        # We need to merge them by surah_number:ayah_number
        merged_ayahs = {}
        
        for batch in ayahs_batches:
            for ayah in batch:
                ref = f"{ayah['surah_number']}_{ayah['ayah_number']}"
                if ref not in merged_ayahs:
                    merged_ayahs[ref] = {}
                merged_ayahs[ref].update(ayah)
        
        for ref, data in merged_ayahs.items():
            sid = f"ayah:quran_{ref}"
            try:
                # Merge into existing record to preserve previous scrapes
                db.query(f"UPDATE {sid} MERGE $data;", {"data": data})
            except Exception as e:
                logger.error(f"Failed to update {sid}: {e}")

@flow(name="Exhaustive Quran Scrape")
def exhaustive_quran_scrape_flow(batch_size: int = 15):
    logger = get_run_logger()
    all_editions = BASE_EDITIONS + load_editions()
    logger.info(f"Total editions to scrape: {len(all_editions)}")
    
    # Batch editions to avoid URL length and timeout issues
    edition_batches = [all_editions[i:i + batch_size] for i in range(0, len(all_editions), batch_size)]
    
    for surah_num in range(1, 115):
        logger.info(f"--- Processing Surah {surah_num} ---")
        surah_results = []
        for e_batch in edition_batches:
            try:
                batch_data = fetch_surah_batch(surah_num, e_batch)
                surah_results.append(batch_data)
                time.sleep(1) # Rate limiting respect
            except Exception as e:
                logger.error(f"Failed batch for Surah {surah_num}: {e}")
        
        if surah_results:
            save_ayah_data_to_db(surah_results)
            logger.info(f"Successfully merged all editions for Surah {surah_num}")

if __name__ == "__main__":
    exhaustive_quran_scrape_flow()
