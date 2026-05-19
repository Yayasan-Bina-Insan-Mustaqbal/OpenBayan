import os
import sys
import re
import time
import requests
import json
from dotenv import load_dotenv

# Ensure we can import utils
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from utils import strip_tashkeel, start_memory_guard, log_memory_status

# Load environment variables
load_dotenv()

SURREAL_URL = os.getenv("SURREALDB_URL", "http://192.168.100.33:8000/sql")
if SURREAL_URL.startswith("ws"):
    SURREAL_URL = SURREAL_URL.replace("ws", "http").replace("/rpc", "/sql")
if not SURREAL_URL.endswith("/sql"):
    SURREAL_URL = f"{SURREAL_URL.rstrip('/')}/sql"

SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

HEADERS = {
    "Surreal-NS": SURREAL_NS,
    "Surreal-DB": SURREAL_DB,
    "Accept": "application/json",
    "Content-Type": "text/plain"
}
AUTH = (SURREAL_USER, SURREAL_PASS)

from concurrent.futures import ThreadPoolExecutor

def execute_surreal(query: str):
    res = requests.post(SURREAL_URL, headers=HEADERS, auth=AUTH, data=query.encode('utf-8'), timeout=15)
    if res.status_code != 200:
        raise Exception(f"SurrealDB Error: {res.text}")
    return res.json()

def update_single_sentence(record):
    record_id = record["id"]
    raw_text = record.get("text", "")
    clean_text = strip_tashkeel(raw_text)
    
    # Escape single quotes and backslashes in SurrealQL
    safe_clean_text = clean_text.replace("\\", "\\\\").replace("'", "\\'")
    
    # Format record ID safely with backticks to handle special/Arabic characters
    tb, rid = record_id.split(":", 1)
    rid_clean = rid.strip("`").replace("'", "\\'")
    safe_record_id = f"{tb}:`{rid_clean}`"
    
    query = f"UPDATE {safe_record_id} SET simple_clean_text = '{safe_clean_text}';"
    try:
        execute_surreal(query)
        return True
    except Exception as e:
        # If it failed due to a syntax error, try setting simple_clean_text empty or just log it
        print(f"Warning: Failed to update {record_id}: {e}")
        return False

def populate_clean_sentences(batch_size: int = 200):
    print("Bismillahir Rahmanir Rahim.")
    print("Starting Harakat Stripping migration utility for sentence table...")
    
    # Start system-wide memory safety guard
    start_memory_guard(min_available_mb=500)
    log_memory_status("Startup")
    
    # 1. Fetch count of pending sentences
    count_query = "SELECT count() FROM sentence WHERE simple_clean_text IS NONE OR simple_clean_text = '' GROUP ALL;"
    res = execute_surreal(count_query)
    pending_count = 0
    if res and res[0].get("result"):
        pending_count = res[0]["result"][0].get("count", 0)
    
    print(f"Found {pending_count} sentences lacking simple_clean_text.")
    if pending_count == 0:
        print("No sentences need updating. Alhamdulillah!")
        return

    processed = 0
    t0 = time.time()
    
    while True:
        # Fetch a batch of sentences
        fetch_query = f"SELECT id, text FROM sentence WHERE simple_clean_text IS NONE OR simple_clean_text = '' LIMIT {batch_size};"
        res = execute_surreal(fetch_query)
        records = res[0].get("result", [])
        
        if not records:
            break
            
        print(f"Processing batch of {len(records)} sentences concurrently...")
        
        # Execute concurrent updates
        with ThreadPoolExecutor(max_workers=20) as executor:
            results = list(executor.map(update_single_sentence, records))
        
        success_count = sum(1 for r in results if r)
        processed += len(records)
        elapsed = time.time() - t0
        speed = processed / elapsed if elapsed > 0 else 0
        eta = (pending_count - processed) / speed if speed > 0 else 0
        
        print(f"  -> Processed {processed}/{pending_count} ({processed/pending_count*100:.2f}%) | Success: {success_count}/{len(records)} | Speed: {speed:.1f}/s | ETA: {eta/60:.1f}m")
        log_memory_status(f"Batch {processed}")
        
        # Be gentle to RocksDB memory pools
        time.sleep(0.05)

    print(f"\nAlhamdulillah! Harakat stripping utility complete! Processed {processed} sentences in {time.time() - t0:.1f}s.")

if __name__ == "__main__":
    populate_clean_sentences()
