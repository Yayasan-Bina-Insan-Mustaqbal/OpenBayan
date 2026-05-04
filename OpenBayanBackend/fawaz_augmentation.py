import os
import requests
import json
import time
from typing import List, Dict, Any
from surrealdb import Surreal
from prefect import flow, task, get_run_logger
from utils import log_memory_status, check_memory_threshold, add_source_metadata
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration from environment variables
SURREAL_URL = os.getenv("SURREALDB_URL", os.getenv("SURREAL_WS_URL", "ws://192.168.100.33:8000/rpc"))
if not SURREAL_URL.endswith("/rpc"):
    SURREAL_URL = f"{SURREAL_URL.replace('http', 'ws')}/rpc"

SURREAL_USER = os.getenv("SURREALDB_USERNAME", os.getenv("SURREAL_USER", "root"))
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", os.getenv("SURREAL_PASS", "RwAbXjBc2z36z"))
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", os.getenv("SURREAL_NS", "main"))
SURREAL_DB = os.getenv("SURREALDB_DATABASE", os.getenv("SURREAL_DB", "main"))

GITHUB_RAW_BASE = "https://raw.githubusercontent.com/fawazahmed0/quran-api/1/editions/"

@task(retries=3, retry_delay_seconds=30)
def get_available_editions() -> List[str]:
    logger = get_run_logger()
    url = "https://api.github.com/repos/fawazahmed0/quran-api/contents/editions?ref=1"
    res = requests.get(url)
    res.raise_for_status()
    # Filter only .json files (not .min.json or folders)
    editions = [item["name"] for item in res.json() if item["name"].endswith(".json") and not item["name"].endswith(".min.json")]
    logger.info(f"Found {len(editions)} edition files on GitHub.")
    return editions

@task(retries=3, retry_delay_seconds=60)
def scrape_and_merge_edition(edition_file: str):
    logger = get_run_logger()
    edition_id = edition_file.replace(".json", "").replace("-", "_")
    
    # Check if already processed (check a sample record)
    try:
        with Surreal(SURREAL_URL) as db:
            db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
            db.use(SURREAL_NS, SURREAL_DB)
            res = db.query(f"SELECT {edition_id} FROM ayah:quran_1_1;")
            if res and isinstance(res, list) and len(res) > 0:
                # In SurrealDB 3.x Python SDK, query returns a list of results directly
                # If we select a field that exists, it will be in the first item of the list
                if res[0].get(edition_id) is not None:
                    logger.info(f"Edition {edition_id} already exists. Skipping.")
                    return

    except Exception as e:
        logger.warning(f"Failed to check existing edition {edition_id}: {e}")

    url = f"{GITHUB_RAW_BASE}{edition_file}"
    
    logger.info(f"Downloading edition: {edition_id}")
    res = requests.get(url)
    res.raise_for_status()
    data = res.json()["quran"]
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        logger.info(f"Merging {len(data)} ayahs for {edition_id} into SurrealDB")
        for item in data:
            ref = f"{item['chapter']}_{item['verse']}"
            sid = f"ayah:quran_{ref}"
            
            # Prepare payload with source metadata
            payload = {edition_id: item["text"]}
            payload = add_source_metadata(payload, "fawaz-ahmed")

            try:
                db.query(f"UPDATE {sid} MERGE $data;", {"data": payload})
            except Exception as e:
                logger.error(f"Failed merge for {sid} in {edition_id}: {e}")
    
    # Explicitly clear data to help GC
    del data

@flow(name="Linguistic Augmentation Flow")
def linguistic_augmentation_flow(limit: int = 500, mem_threshold: int = 4000):
    logger = get_run_logger()
    editions = get_available_editions()
    
    count = 0
    for edition in editions:
        if count >= limit:
            break
        
        # Monitor RAM before each edition
        check_memory_threshold(mem_threshold)
        log_memory_status(f"Edition {edition}")

        try:
            scrape_and_merge_edition(edition)
            count += 1
            time.sleep(2)
        except Exception as e:
            logger.error(f"Failed edition {edition}: {e}")

if __name__ == "__main__":
    linguistic_augmentation_flow()
