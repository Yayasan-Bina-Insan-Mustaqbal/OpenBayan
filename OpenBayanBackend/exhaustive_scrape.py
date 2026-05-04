import requests
import json
import time
from typing import List, Dict, Any
from surrealdb import Surreal
from prefect import flow, task, get_run_logger
from utils import log_memory_status, check_memory_threshold, add_source_metadata

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
    res = requests.get(url, timeout=300) 
    res.raise_for_status()
    data = res.json()["data"]
    
    num_ayahs = len(data[0]["ayahs"])
    ayahs_batch = []
    
    for i in range(num_ayahs):
        # We don't want to overwrite metadata, so we only include identifying fields and new editions
        ayah_data = {
            "surah_number": surah_number, 
            "ayah_number": data[0]["ayahs"][i]["numberInSurah"]
        }
        
        # Add Source Metadata
        ayah_data = add_source_metadata(ayah_data, "quran-cloud")

        for idx, edition_data in enumerate(data):
            identifier = editions[idx]
            text = edition_data["ayahs"][i]["text"]
            
            key = identifier.replace(".", "_").replace("-", "_")
            ayah_data[key] = text
            
            # Metadata only if first in batch (arbitrary, Surreal merge handles it)
            if idx == 0:
                ayah_data["juz"] = edition_data["ayahs"][i]["juz"]
                ayah_data["hizb_quarter"] = edition_data["ayahs"][i]["hizbQuarter"]
                ayah_data["page"] = edition_data["ayahs"][i]["page"]
                
        ayahs_batch.append(ayah_data)
    return ayahs_batch

@task
def save_batch_to_db(batch: List[Dict[str, Any]]):
    logger = get_run_logger()
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        
        for ayah in batch:
            ref = f"{ayah['surah_number']}_{ayah['ayah_number']}"
            sid = f"ayah:quran_{ref}"
            try:
                db.query(f"UPDATE {sid} MERGE $data;", {"data": ayah})
            except Exception as e:
                logger.error(f"Failed to update {sid}: {e}")

@flow(name="Exhaustive Quran Scrape")
def exhaustive_quran_scrape_flow(batch_size: int = 15, mem_threshold: int = 4000):
    logger = get_run_logger()
    all_editions = BASE_EDITIONS + load_editions()
    logger.info(f"Total editions to scrape: {len(all_editions)}")
    
    edition_batches = [all_editions[i:i + batch_size] for i in range(0, len(all_editions), batch_size)]
    
    for surah_num in range(1, 115):
        check_memory_threshold(mem_threshold)
        log_memory_status(f"Surah {surah_num}")
        
        for e_batch in edition_batches:
            try:
                batch_data = fetch_surah_batch(surah_num, e_batch)
                save_batch_to_db(batch_data)
                # Clear large object from memory explicitly
                del batch_data
                time.sleep(1) 
            except Exception as e:
                logger.error(f"Failed batch for Surah {surah_num}: {e}")

if __name__ == "__main__":
    exhaustive_quran_scrape_flow()
