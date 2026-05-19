import os
import re
import time
import requests
import json
from typing import Optional, List, Dict, Any
from datasets import load_dataset
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

load_dotenv()

# Configuration - Using HTTP for stability
SURREAL_URL = "http://192.168.100.33:8000/sql"
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

SURREAL_AUTH = (SURREAL_USER, SURREAL_PASS)
SURREAL_HEADERS = {
    "surreal-ns": SURREAL_NS,
    "surreal-db": SURREAL_DB,
    "Accept": "application/json"
}

def execute_query(query: str):
    """Execute query via HTTP."""
    res = requests.post(
        SURREAL_URL,
        auth=SURREAL_AUTH,
        headers=SURREAL_HEADERS,
        data=query.encode('utf-8')
    )
    return res

def process_batch(batch: List[Dict[str, Any]], col_name: str, count_offset: int, logger):
    queries = []
    for i, item in enumerate(batch):
        bid = item.get("book_id", 0)
        pnum = item.get("page_number", 0)
        
        # Unique ID combining collection and offset to avoid collisions
        p_id = f"athar_{col_name}_{bid}_p{pnum}_{count_offset + i}"
        src_id = f"athar_book_{bid}"
        
        title = (item.get("book_title") or "Unknown Athar Book").replace("'", "\\'")
        author = (item.get("author") or "Unknown Author").replace("'", "\\'")
        content = (str(item.get("content", ""))).replace("\\", "\\\\").replace("'", "\\'")
        cat = str(item.get("category", col_name)).replace("'", "\\'")
        
        q = f"""
        UPSERT source:`{src_id}` SET 
            identifier = '{src_id}',
            title = '{title}',
            author = '{author}',
            type = 'book',
            language = 'ar';
            
        UPSERT book_page:`{p_id}` SET 
            content = '{content}',
            source = source:`{src_id}`,
            page_number = {pnum},
            category = '{cat}',
            processed_for_kg = false,
            processed_for_rijal = false;
        """
        queries.append(q)
    
    full_query = "\n".join(queries)
    try:
        res = execute_query(full_query)
        if res.status_code != 200:
            logger.error(f"Batch Error: {res.text[:500]}")
            return False
        return True
    except Exception as e:
        logger.error(f"Request Error: {e}")
        return False

@flow(name="Athar Final Ingestion Phase")
def athar_ingestion_flow(resume_col_idx: int = 6, skip_in_col: int = 366000):
    logger = get_run_logger()
    
    collections = [
        "aqeedah_passages.jsonl.gz",         # 0
        "arabic_language_passages.jsonl.gz",  # 1
        "fiqh_passages.jsonl.gz",             # 2
        "general_islamic.jsonl.gz",          # 3 (Schema issues)
        "hadith_passages.jsonl.gz",           # 4 (Schema issues)
        "islamic_history_passages.jsonl.gz",  # 5 (Done)
        "quran_tafsir.jsonl.gz",             # 6 (Resuming)
        "seerah_passages.jsonl.gz",          # 7
        "spirituality_passages.jsonl.gz",     # 8
        "usul_fiqh.jsonl.gz"                 # 9
    ]
    
    target_collections = collections[resume_col_idx:]
    
    logger.info(f"Starting final phase for {len(target_collections)} Athar collections...")
    
    batch_size = 50 
    
    for i, col_file in enumerate(target_collections):
        logger.info(f"Processing collection: {col_file}")
        col_name = col_file.split(".")[0]
        
        # Only skip on the first collection in this loop
        current_skip = skip_in_col if i == 0 else 0
        
        try:
            dataset = load_dataset(
                "Kandil7/Athar-Datasets", 
                data_files=f"collections/{col_file}",
                split="train", 
                streaming=True,
                token=os.getenv("HF_TOKEN")
            )
            
            count = 0
            current_batch = []
            for row in dataset:
                count += 1
                if count <= current_skip:
                    continue
                    
                current_batch.append(row)
                
                if len(current_batch) >= batch_size:
                    success = process_batch(current_batch, col_name, count - len(current_batch), logger)
                    if not success:
                        time.sleep(2)
                        
                    if count % 5000 == 0:
                        logger.info(f"[{col_file}] Ingested {count} passages...")
                    current_batch = []
            
            # Final batch
            if current_batch:
                 process_batch(current_batch, col_name, count - len(current_batch), logger)
                 logger.info(f"[{col_file}] Finished. Total: {count}")

        except Exception as e:
            logger.error(f"Failed collection {col_file}: {e}")
            time.sleep(5)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--col", type=int, default=6, help="Start from collection index")
    parser.add_argument("--skip", type=int, default=366000, help="Skip N passages in the first collection")
    args = parser.parse_args()
    athar_ingestion_flow(resume_col_idx=args.col, skip_in_col=args.skip)
