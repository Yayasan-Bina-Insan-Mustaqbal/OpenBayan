from typing import Optional
import os
import re
import time
from datasets import load_dataset
from surrealdb import Surreal, RecordID
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

load_dotenv()

SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

def process_batch(db, batch, col_name, count_offset, logger):
    for i, item in enumerate(batch):
        bid = item.get("book_id", 0)
        pnum = item.get("page_number", 0)
        
        # Use a more stable ID format
        p_id = f"athar_{col_name}_{bid}_p{pnum}_{count_offset + i}"
        rid = RecordID("book_page", p_id)
        src_id = f"athar_book_{bid}"
        src_rid = RecordID("source", src_id)
        
        try:
            # 1. Update source (UPSERT)
            db.query("""
                UPSERT $src SET 
                    identifier = $src_id,
                    title = $title,
                    author = $author,
                    type = 'book',
                    language = 'ar';
            """, {
                "src": src_rid,
                "src_id": src_id,
                "title": item.get("book_title") or "Unknown Athar Book",
                "author": item.get("author") or "Unknown Author"
            })
            
            # 2. Update page (UPSERT - overwrite if exists to allow safe retries)
            # Use separate query to be safe with locks
            db.query("""
                UPSERT $id SET 
                    content = $text,
                    source = $src,
                    page_number = $page,
                    category = $cat,
                    processed_for_kg = false,
                    processed_for_rijal = false;
            """, {
                "src": src_rid,
                "id": rid,
                "text": item.get("content", ""),
                "page": pnum,
                "cat": item.get("category", col_name)
            })
        except Exception as e:
            logger.error(f"DB Error for {p_id}: {e}")
            # Cool down on error
            time.sleep(2)

@flow(name="Athar Large Scale Ingestion")
def athar_ingestion_flow(skip_global: int = 0, max_items: Optional[int] = None):
    logger = get_run_logger()
    logger.info(f"Starting Athar Datasets Ingestion (skipping {skip_global}, max {max_items})...")
    
    collections = [
        "aqeedah_passages.jsonl.gz",
        "arabic_language_passages.jsonl.gz",
        "fiqh_passages.jsonl.gz",
        "general_islamic.jsonl.gz",
        "hadith_passages.jsonl.gz",
        "islamic_history_passages.jsonl.gz",
        "quran_tafsir.jsonl.gz",
        "seerah_passages.jsonl.gz",
        "spirituality_passages.jsonl.gz",
        "usul_fiqh.jsonl.gz"
    ]
    
    batch_size = 20 # Capped batch size
    global_count = 0
    processed_count = 0
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        logger.info("Connected to SurrealDB.")

        for col_file in collections:
            logger.info(f"Processing collection: {col_file}")
            col_name = col_file.split(".")[0]
            try:
                # Load specific file
                dataset = load_dataset(
                    "Kandil7/Athar-Datasets", 
                    data_files=f"collections/{col_file}",
                    split="train", 
                    streaming=True
                )
                
                count = 0
                current_batch = []
                for row in dataset:
                    global_count += 1
                    if global_count <= skip_global:
                        continue
                        
                    current_batch.append(row)
                    count += 1
                    processed_count += 1
                    
                    if len(current_batch) >= batch_size:
                        process_batch(db, current_batch, col_name, count - len(current_batch), logger)
                        if count % 200 == 0:
                            logger.info(f"[{col_file}] Ingested {count} passages... (Global: {global_count})")
                            # Explicit delay to prevent DB over-pressure
                            time.sleep(0.5)
                        current_batch = []
                    
                    if max_items and processed_count >= max_items:
                        logger.info(f"Reached max items limit ({max_items}). Stopping.")
                        return

                # Final batch for collection
                if current_batch:
                     process_batch(db, current_batch, col_name, count - len(current_batch), logger)
                     logger.info(f"[{col_file}] Finished. Total: {count}")

            except Exception as e:
                logger.error(f"Failed collection {col_file}: {e}")
                # Try to reconnect
                try:
                    db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
                    db.use(SURREAL_NS, SURREAL_DB)
                except:
                    pass

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip", type=int, default=0, help="Skip N global items")
    parser.add_argument("--limit", type=int, default=None, help="Limit total items in this run")
    args = parser.parse_args()
    athar_ingestion_flow(skip_global=args.skip, max_items=args.limit)
