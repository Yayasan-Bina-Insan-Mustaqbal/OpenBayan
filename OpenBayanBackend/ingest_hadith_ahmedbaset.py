import os
import json
import requests
from typing import List, Dict, Any
from surrealdb import Surreal
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

from surrealdb import Surreal, RecordID

# ... (rest of imports)

@task(name="ingest-hadith-collection")
def ingest_hadith_collection(file_path: str, collection_name: str):
    logger = get_run_logger()
    logger.info(f"Starting ingestion for {collection_name} from {file_path}")

    if not os.path.exists(file_path):
        logger.error(f"File not found: {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    chapters = {c['id']: c['arabic'] for c in data.get('chapters', [])}
    hadiths = data.get('hadiths', [])

    logger.info(f"Found {len(hadiths)} hadiths in {collection_name}")

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)

        # 1. Ensure source record exists
        source_rid = RecordID("source", f"hadith_{collection_name}")
        db.query("""
            UPSERT $id SET 
                identifier = $collection,
                title = $title,
                type = 'hadith',
                language = 'ar';
        """, {
            "id": source_rid,
            "collection": collection_name,
            "title": data.get('metadata', {}).get('arabic', {}).get('title', collection_name)
        })

        # 2. Ingest hadiths in batches
        batch_size = 100
        for i in range(0, len(hadiths), batch_size):
            batch = hadiths[i:i + batch_size]
            for h in batch:
                try:
                    h_rid = RecordID("hadith", f"{collection_name}_{h['idInBook']}")
                    chap_title = chapters.get(h.get('chapterId'))
                    
                    db.query("""
                        UPSERT $id SET 
                            collection = $coll,
                            hadith_number = $num,
                            chapter_title = $chap,
                            matn_ar = $ar,
                            matn_en = $en,
                            sanad_raw = $sn,
                            raw_dataset_source = 'AhmedBaset',
                            source = $src;
                    """, {
                        "id": h_rid,
                        "coll": collection_name,
                        "num": str(h.get('idInBook')),
                        "chap": chap_title,
                        "ar": h.get('arabic'),
                        "en": h.get('english', {}).get('text'),
                        "sn": h.get('english', {}).get('narrator'),
                        "src": source_rid
                    })
                except Exception as e:
                    logger.error(f"Error ingesting hadith {h.get('idInBook')}: {e}")
            
            logger.info(f"  Processed {min(i + batch_size, len(hadiths))} hadiths...")

@flow(name="Hadith Ingestion Flow")
def hadith_ingestion_flow():
    # Use relative path from script directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(script_dir, "data/hadith")
    
    collections = [
        "bukhari", "muslim", "abudawud", "tirmidhi", 
        "nasai", "ibnmajah", "malik", "ahmed", "darimi",
        "riyadassalihin", "aladabalmufrad", "bulughalmaram", 
        "shamail", "mishkat", "nawawi40", "qudsi40", "shahwaliullah40"
    ]
    
    for collection in collections:
        file_path = f"{data_dir}/{collection}.json"
        if os.path.exists(file_path):
            ingest_hadith_collection(file_path, collection)
        else:
            get_run_logger().warning(f"File not found: {file_path}")

if __name__ == "__main__":
    hadith_ingestion_flow()
