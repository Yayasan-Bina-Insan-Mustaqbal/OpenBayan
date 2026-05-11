import os
import re
import requests
import urllib.parse
from typing import Optional
from surrealdb import Surreal
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000")
if not SURREAL_URL.endswith("/rpc"):
    SURREAL_URL = f"{SURREAL_URL.replace('http', 'ws')}/rpc"

SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "OpenBayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "OpenBayan")

HF_BASE_URL = "https://huggingface.co/datasets/ieasybooks-org/shamela-waqfeya-library/resolve/main/"

@task
def download_book_content(rel_path):
    logger = get_run_logger()
    if rel_path.startswith("./"):
        rel_path = rel_path[2:]
    
    full_url = HF_BASE_URL + urllib.parse.quote(rel_path)
    logger.info(f"Downloading from: {full_url}")
    
    res = requests.get(full_url)
    res.raise_for_status()
    res.encoding = 'utf-8'
    return res.text

@task
def save_page_to_surreal(db_config, source_id, page_number, content):
    logger = get_run_logger()
    
    # Clean source_id for use in ID generation
    if ":" in source_id:
        inner_id = source_id.split(":", 1)[1].replace("`", "")
    else:
        inner_id = source_id.replace("`", "")
        
    page_id = f"book_page:`{inner_id}_p{page_number}`"
    
    # Re-use connection details but we'll need to open one in the task if not using a global pool
    # Actually, Prefect tasks are best when they are atomic. 
    # But since we have thousands of pages, let's batch them in the flow instead.
    
    # (Leaving this task for now, but I will modify the flow to batch)
    pass

@flow(name="Shamela Book-Page Ingestion")
def shamela_book_ingestion_flow(source_id: str):
    logger = get_run_logger()
    logger.info(f"Starting book-page ingestion for {source_id}")
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        # 1. Fetch metadata
        query = "SELECT title, file_paths.txt FROM type::record($id)"
        res = db.query(query, {"id": source_id})
        
        if not res or not res[0]:
            if ":" in source_id:
                parts = source_id.split(":")
                tb = parts[0]
                rid = ":".join(parts[1:]).replace("`", "")
                query = f"SELECT title, file_paths.txt FROM {tb}:`{rid}`"
                res = db.query(query)
        
        if not res or not res[0]:
            logger.error(f"Source {source_id} not found in database.")
            return
        
        book_data = res[0]
        title = book_data["title"]
        txt_paths = book_data.get("file_paths", {}).get("txt", [])
    
        if not txt_paths:
            logger.error(f"No text paths found for {source_id}")
            return
    
        # 2. Process each TXT file
        global_page_count = 0
        for txt_path in txt_paths:
            full_text = download_book_content(txt_path)
            pages = full_text.split("PAGE_SEPARATOR")
            logger.info(f"Found {len(pages)} pages in {txt_path}")
            
            # Clean source_id for use in ID generation
            if ":" in source_id:
                inner_id = source_id.split(":", 1)[1].replace("`", "")
            else:
                inner_id = source_id.replace("`", "")
            
            # Ensure source_id is a proper record string
            if not source_id.startswith("source:"):
                 source_rec = f"source:`{source_id.replace('`','')}`"
            else:
                 parts = source_id.split(":", 1)
                 source_rec = f"{parts[0]}:`{parts[1].replace('`','')}`"

            for i, page_content in enumerate(pages):
                page_content = page_content.strip()
                if not page_content:
                    continue
                    
                global_page_count += 1
                page_id = f"book_page:`{inner_id}_p{global_page_count}`"
                
                query = """
                UPSERT type::record($id) SET
                    source = type::record($source),
                    page_number = $page_num,
                    content = $content;
                """
                params = {
                    "id": page_id,
                    "source": source_rec,
                    "page_num": global_page_count,
                    "content": page_content
                }
                
                try:
                    db.query(query, params)
                    if global_page_count % 100 == 0:
                        logger.info(f"Ingested {global_page_count} pages...")
                except Exception as e:
                    logger.error(f"Failed to save book page {global_page_count}: {e}")
            
    logger.info(f"Completed ingestion of {global_page_count} pages for {title}")            
    logger.info(f"Completed ingestion of {global_page_count} pages for {title}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        target_id = sys.argv[1]
    else:
        # Default test
        target_id = "source:`shamela_أربع_قواعد_تدور_الأحكام_عليها__ابن_عبد_الوهاب_محمد_بن_عبد_الوهاب`"
    
    shamela_book_ingestion_flow(source_id=target_id)
