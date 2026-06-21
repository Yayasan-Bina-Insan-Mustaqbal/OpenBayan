import os
import time
import requests
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(levelname)-7s | %(message)s')
logger = logging.getLogger(__name__)

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "http://192.168.100.33:8000/sql")
if SURREAL_URL.startswith("ws"):
    SURREAL_URL = SURREAL_URL.replace("ws", "http").replace("/rpc", "/sql")
if not SURREAL_URL.endswith("/sql"):
    SURREAL_URL = f"{SURREAL_URL.rstrip('/')}/sql"

SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

SURREAL_AUTH = (SURREAL_USER, SURREAL_PASS)
SURREAL_HEADERS = {
    "surreal-ns": SURREAL_NS,
    "surreal-db": SURREAL_DB,
    "Accept": "application/json",
    "Content-Type": "text/plain"
}

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
# Using nomic-embed-text:latest for 10x speedup
OLLAMA_EMBED_MODEL = "nomic-embed-text:latest"
BATCH_SIZE = 50
MAX_WORKERS = 32

def execute_sql(sql: str, retries: int = 5, backoff: float = 2.0):
    for attempt in range(retries):
        try:
            res = requests.post(
                SURREAL_URL, 
                auth=SURREAL_AUTH, 
                headers=SURREAL_HEADERS, 
                data=sql.encode('utf-8'), 
                timeout=600
            )
            if res.status_code != 200:
                logger.error(f"SurrealDB Error Code {res.status_code}: {res.text[:200]}")
                raise Exception(f"SurrealDB Error")
            return res.json()
        except requests.exceptions.RequestException as e:
            if attempt == retries - 1:
                logger.error(f"Max retries reached for execute_sql: {e}")
                raise e
            time.sleep(backoff * (2 ** attempt))

def fetch_unembedded_sentences(limit: int = BATCH_SIZE):
    q = f"SELECT id, simple_clean_text, text FROM sentence WHERE is_embedded = false LIMIT {limit};"
    res = execute_sql(q)
    if res and len(res) > 0 and 'result' in res[0]:
        return res[0]['result']
    return []

def get_embedding(text: str):
    try:
        res = requests.post(
            f"{OLLAMA_URL}/api/embeddings", 
            json={"model": OLLAMA_EMBED_MODEL, "prompt": text}, 
            timeout=120
        )
        res.raise_for_status()
        return res.json().get("embedding")
    except Exception as e:
        logger.error(f"Ollama Embed Error: {e}")
        return None

def process_sentence(record):
    record_id = record['id']
    # Prioritize clean text for better semantic matching
    text_to_embed = record.get('simple_clean_text', '')
    if not text_to_embed:
        text_to_embed = record.get('text', '')
        
    if not text_to_embed or len(text_to_embed.strip()) == 0:
        # Dummy embedding for empty records to avoid infinite loop
        return record_id, "NONE"
        
    embed = get_embedding(text_to_embed)
    if embed is None:
        return record_id, None
        
    return record_id, embed

def vectorizer_daemon():
    logger.info(f"Starting Background Vectorizer daemon using {OLLAMA_EMBED_MODEL}...")
    
    total_processed = 0
    start_time_global = time.time()
    
    while True:
        try:
            batch = fetch_unembedded_sentences(BATCH_SIZE)
            
            if not batch:
                logger.info("No unembedded sentences found. Sleeping for 30 seconds...")
                time.sleep(30)
                continue
                
            batch_start_time = time.time()
            results = []
            
            # Parallel embedding generation
            with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                future_to_record = {executor.submit(process_sentence, rec): rec for rec in batch}
                for future in as_completed(future_to_record):
                    try:
                        record_id, embed = future.result()
                        if embed is not None:
                            results.append((record_id, embed))
                    except Exception as exc:
                        logger.error(f"Record processing generated an exception: {exc}")
                        
            # Bulk update
            if results:
                queries = ["BEGIN TRANSACTION;"]
                for record_id, embed in results:
                    if embed == "NONE":
                        # Handled empty text gracefully by setting to empty array or skipping, but we must update so it isn't queried again.
                        queries.append(f"UPDATE {record_id} SET embedding = [], is_embedded = true;")
                    else:
                        embed_str = json.dumps(embed)
                        queries.append(f"UPDATE {record_id} SET embedding = {embed_str}, is_embedded = true;")
                queries.append("COMMIT TRANSACTION;")
                
                full_query = "\n".join(queries)
                execute_sql(full_query)
                
                total_processed += len(results)
                
                elapsed_batch = time.time() - batch_start_time
                elapsed_global = time.time() - start_time_global
                speed = (total_processed / elapsed_global) * 60
                
                logger.info(f"Embedded {len(results)} sentences in {elapsed_batch:.2f}s | "
                            f"Total: {total_processed} | Speed: {speed:.1f} chunks/min")
            else:
                logger.warning("Batch resulted in 0 successful embeddings. Sleeping...")
                time.sleep(5)
                
        except Exception as e:
            logger.error(f"Daemon encountered a fatal error: {e}")
            time.sleep(10)

if __name__ == "__main__":
    vectorizer_daemon()
