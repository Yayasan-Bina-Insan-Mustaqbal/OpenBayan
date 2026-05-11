import os
import json
import requests
from typing import List, Dict, Any
from surrealdb import Surreal, RecordID
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

load_dotenv()

SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

@task(name="ingest-passage-batch")
def ingest_passage_batch(passages: List[Dict]):
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        for p in passages:
            try:
                # p format: {"id": ..., "text": "...", "book_id": ..., "metadata": {...}}
                # Map to book_page schema or a new table for passages
                # For consistency with current kitabs, we use book_page with a virtual source
                p_id = f"passage_{p['id']}"
                rid = RecordID("book_page", p_id)
                src_rid = RecordID("source", f"shamela_passage_book_{p.get('book_id', 'unknown')}")
                
                db.query("""
                    UPSERT $id SET 
                        content = $text,
                        source = $src,
                        processed_for_kg = false,
                        processed_for_rijal = false;
                """, {
                    "id": rid,
                    "text": p.get("text", ""),
                    "src": src_rid
                })
            except Exception as e:
                pass

@flow(name="Shamela Passages Ingestion Flow")
def shamela_passages_flow(file_path: str):
    logger = get_run_logger()
    logger.info(f"Starting Shamela Passages ingestion from {file_path}")
    
    # Example processing for a large JSONL/Parquet file
    # This is a placeholder for the actual download and stream logic
    # In a real scenario, we'd use huggingface_hub to stream the dataset
    pass

if __name__ == "__main__":
    # Placeholder for actual dataset streaming
    pass
