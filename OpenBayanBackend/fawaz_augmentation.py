import requests
import json
import time
from typing import List, Dict, Any
from surrealdb import Surreal
from prefect import flow, task, get_run_logger

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000")
if not SURREAL_URL.endswith("/rpc"):
    SURREAL_URL = f"{SURREAL_URL.replace('http', 'ws')}/rpc"

SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
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
    url = f"{GITHUB_RAW_BASE}{edition_file}"
    
    logger.info(f"Downloading edition: {edition_id}")
    res = requests.get(url)
    res.raise_for_status()
    data = res.json()["quran"]
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use("openbayan", "openbayan")
        
        logger.info(f"Merging {len(data)} ayahs for {edition_id} into SurrealDB")
        for item in data:
            ref = f"{item['chapter']}_{item['verse']}"
            sid = f"ayah:quran_{ref}"
            payload = {edition_id: item["text"]}
            try:
                db.query(f"UPDATE {sid} MERGE $data;", {"data": payload})
            except Exception as e:
                logger.error(f"Failed merge for {sid} in {edition_id}: {e}")

@flow(name="Linguistic Augmentation Flow")
def linguistic_augmentation_flow(limit: int = 500):
    logger = get_run_logger()
    editions = get_available_editions()
    
    # Process in sequence to be gentle on GitHub and SurrealDB
    count = 0
    for edition in editions:
        if count >= limit:
            break
        try:
            scrape_and_merge_edition(edition)
            count += 1
            # Rate limiting respect
            time.sleep(2)
        except Exception as e:
            logger.error(f"Failed edition {edition}: {e}")

if __name__ == "__main__":
    linguistic_augmentation_flow()
