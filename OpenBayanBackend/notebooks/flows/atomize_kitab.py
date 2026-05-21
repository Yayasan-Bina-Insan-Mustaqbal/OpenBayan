import os
import re
import requests
import json
import time
from typing import List, Dict, Any, Optional
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

load_dotenv()

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
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "mxbai-embed-large:latest")

def strip_tashkeel(text: str) -> str:
    if not text: return ""
    tashkeel_pattern = re.compile(r'[\u064B-\u0652\u0640\u0617-\u061A\u06D6-\u06ED]')
    return tashkeel_pattern.sub('', text)

def get_embedding(text: str):
    try:
        res = requests.post(f"{OLLAMA_URL}/api/embeddings", json={"model": OLLAMA_EMBED_MODEL, "prompt": text}, timeout=60)
        res.raise_for_status()
        return res.json()["embedding"]
    except Exception:
        return None

def execute_sql(sql: str):
    res = requests.post(SURREAL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=sql.encode('utf-8'))
    if res.status_code != 200:
        raise Exception(f"SurrealDB Error: {res.text}")
    return res.json()

def recursive_arabic_chunker(text: str, max_words: int = 350, overlap_percent: float = 0.15) -> List[str]:
    """
    Splits text into chunks by word count with overlap.
    Ensures context is preserved at boundaries.
    """
    if not text: return []
    
    words = text.split()
    if len(words) <= max_words:
        return [text]
        
    chunks = []
    step = int(max_words * (1 - overlap_percent))
    
    for i in range(0, len(words), step):
        chunk_words = words[i:i + max_words]
        if not chunk_words: break
        
        chunks.append(" ".join(chunk_words))
        
        # If we reached the end of the text
        if i + max_words >= len(words):
            break
            
    return chunks

@task(name="Atomize Kitab Page Task")
def atomize_page_task(page: Dict[str, Any]):
    logger = get_run_logger()
    content = page.get("content", "")
    if not content or len(content.strip()) < 20:
        # Still mark as processed so we don't loop on empty pages
        execute_sql(f"UPDATE {str(page['id'])} SET processed_for_sentences = true;")
        return 0

    # 1. Chunking: Recursive word-based with 15% overlap
    chunks = recursive_arabic_chunker(content, max_words=350, overlap_percent=0.15)

    page_id = str(page['id'])  # e.g. book_page:`shamela_..._p1`
    source_id = str(page['source'])

    # Extract inner ID for record generation (strip backticks from complex IDs)
    page_inner = page_id.split(':')[-1].replace('`', '').replace(' ', '_')

    upsert_queries = ["BEGIN TRANSACTION;"]
    sentences_added = 0

    for idx, segment in enumerate(chunks):
        clean_segment = strip_tashkeel(segment)
        embedding = get_embedding(clean_segment)

        if not embedding:
            continue

        sent_id = f"sentence:\u27e8kitab_{page_inner}_s{idx}\u27e9"
        safe_text = segment.replace("'", "\\'")
        safe_clean = clean_segment.replace("'", "\\'")

        q = f"""
            UPSERT {sent_id} SET
                text = '{safe_text}',
                simple_clean_text = '{safe_clean}',
                embedding = {json.dumps(embedding)},
                parent = {page_id},
                source = {source_id},
                chunk_index = {idx},
                transliterations = {{ en: "", ru: "", tr: "" }},
                created_at = time::now();
        """
        upsert_queries.append(q)
        sentences_added += 1

    upsert_queries.append("COMMIT TRANSACTION;")

    if sentences_added > 0:
        execute_sql("\n".join(upsert_queries))

    # Mark page as processed in a SEPARATE standalone query
    # (avoids complex ID quoting issues inside transactions)
    execute_sql(f"UPDATE {page_id} SET processed_for_sentences = true;")
    return sentences_added

def update_progress_state(job_name: str, count: int, total: int, speed: float = 0, eta: float = 0):
    try:
        paths = [
            "/app/notebooks/flows/ingestion_state.json",
            os.path.join(os.path.dirname(__file__), 'ingestion_state.json'),
            "ingestion_state.json"
        ]
        
        state_file = None
        for p in paths:
            dir_name = os.path.dirname(p)
            if os.path.exists(dir_name) or dir_name == '':
                state_file = p
                break
                
        if not state_file:
            state_file = "ingestion_state.json"
            
        state = {}
        if os.path.exists(state_file):
            try:
                with open(state_file, 'r') as f:
                    state = json.load(f)
            except Exception:
                state = {}
                
        state[job_name] = {
            "count": count,
            "total": total,
            "speed": speed,
            "eta": eta if eta > 0 else None,
            "time": time.time()
        }
        
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Failed to update progress state: {e}")

@flow(name="Kitab Atomization Flow")
def kitab_atomization_flow(source_id: Optional[str] = None, batch_size: int = 20, limit: Optional[int] = None):
    logger = get_run_logger()
    logger.info("Bismillah. Starting Kitab (Book Page) atomization...")
    
    total_pages = 1000
    try:
        query = "SELECT count() FROM book_page"
        if source_id:
            query += f" WHERE source = {source_id}"
        query += " GROUP ALL;"
        res = execute_sql(query)
        if res and res[0].get('result'):
            total_pages = res[0]['result'][0]['count']
    except Exception as e:
        logger.warning(f"Could not fetch total pages: {e}")

    processed_existing = 0
    try:
        query = "SELECT count() FROM book_page WHERE processed_for_sentences = true"
        if source_id:
            query += f" AND source = {source_id}"
        query += " GROUP ALL;"
        res = execute_sql(query)
        if res and res[0].get('result'):
            processed_existing = res[0]['result'][0]['count']
    except Exception as e:
        logger.warning(f"Could not fetch processed pages: {e}")

    start_time = time.time()
    processed_total = 0
    
    update_progress_state("atomize_kitab.py", processed_existing, total_pages, 0, 0)
    
    while True:
        # Fetch pages that are not yet atomized
        query = "SELECT * FROM book_page WHERE processed_for_sentences != true"
        if source_id:
            query += f" AND source = {source_id}"
        query += f" LIMIT {batch_size}"
        
        res = execute_sql(query)
        batch = res[0].get('result', [])
        
        if not batch:
            logger.info("Alhamdulillah! All available book pages processed.")
            update_progress_state("atomize_kitab.py", total_pages, total_pages, 0, 0)
            break
            
        for page in batch:
            try:
                count = atomize_page_task(page)
                processed_total += 1
                
                count_abs = processed_existing + processed_total
                elapsed = time.time() - start_time
                speed = (processed_total / elapsed) * 60 if elapsed > 0 else 0
                eta = ((total_pages - count_abs) / speed) * 60 if speed > 0 else 0
                update_progress_state("atomize_kitab.py", count_abs, total_pages, speed, eta)
                
                if processed_total % 50 == 0:
                    logger.info(f"Progress: {processed_total} pages atomized.")
            except Exception as e:
                logger.error(f"Failed Page {page['id']}: {e}")
        
        if limit and processed_total >= limit:
            break
            
        # Throttling for DB/Ollama health
        time.sleep(0.2)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=str, default=None, help="Filter by source record ID (e.g. source:shamela_...)")
    parser.add_argument("--batch", type=int, default=20)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    kitab_atomization_flow(source_id=args.source, batch_size=args.batch, limit=args.limit)
