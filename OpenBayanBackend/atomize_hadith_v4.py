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
SURREAL_SQL_URL = os.getenv("SURREALDB_URL", "http://192.168.100.33:8000/sql")
if SURREAL_SQL_URL.startswith("ws"):
    SURREAL_SQL_URL = SURREAL_SQL_URL.replace("ws", "http").replace("/rpc", "/sql")
if not SURREAL_SQL_URL.endswith("/sql"):
    SURREAL_SQL_URL = f"{SURREAL_SQL_URL.rstrip('/')}/sql"

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
    except Exception as e:
        return None

def execute_sql(sql: str):
    res = requests.post(SURREAL_SQL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=sql.encode('utf-8'))
    if res.status_code != 200:
        raise Exception(f"SurrealDB Error: {res.text}")
    return res.json()

def atomize_hadith_logic(hadith: Dict[str, Any], logger):
    text = hadith.get("matn_ar", "")
    if not text: return 0
    
    # Split by common Arabic punctuation
    sentences = re.split(r'(?<=[.؟!])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        sentences = [text.strip()]

    queries = ["BEGIN TRANSACTION;"]
    
    # Correct ID handling for SurrealDB
    hid_raw = str(hadith['id']) # e.g. 'hadith:⟨18_15⟩'
    # Extract the inner ID part carefully
    hid_inner = hid_raw.split(':')[-1].replace('⟨', '').replace('⟩', '')
    
    for idx, segment in enumerate(sentences):
        if len(segment) < 10: continue # Skip very short fragments
        
        clean_segment = strip_tashkeel(segment)
        embedding = get_embedding(clean_segment)
        
        if not embedding:
            continue
            
        # Composite ID for the sentence
        sent_id = f"sentence:⟨hadith_{hid_inner}_s{idx}⟩"
        
        safe_text = segment.replace("'", "\\'")
        safe_clean = clean_segment.replace("'", "\\'")
        
        q = f"""
            UPSERT {sent_id} SET
                text = '{safe_text}',
                simple_clean_text = '{safe_clean}',
                embedding = {json.dumps(embedding)},
                parent = {hid_raw},
                source = source:hadith_650k_sanadset,
                chunk_index = {idx},
                transliterations = {{
                    en: "",
                    ru: "",
                    tr: ""
                }},
                created_at = time::now();
        """
        queries.append(q)
    
    # Mark parent as processed
    queries.append(f"UPDATE {hid_raw} SET processed_for_kg = true;")
    queries.append("COMMIT TRANSACTION;")
    
    if len(queries) > 2:
        execute_sql("\n".join(queries))
    return len(sentences)

@flow(name="Hadith Atomization Flow v4")
def hadith_atomization_flow(batch_size: int = 10, max_hadiths: Optional[int] = None):
    logger = get_run_logger()
    processed_total = 0
    
    while True:
        # Using != true to capture both false and NONE
        res = execute_sql(f"SELECT * FROM hadith WHERE processed_for_kg != true LIMIT {batch_size}")
        batch = res[0]['result']
        
        if not batch:
            logger.info("No more unprocessed hadiths found.")
            break
            
        for hadith in batch:
            try:
                atomize_hadith_logic(hadith, logger)
                processed_total += 1
                if processed_total % 50 == 0:
                    logger.info(f"Progress: {processed_total} hadiths atomized.")
            except Exception as e:
                logger.error(f"Failed hadith {hadith['id']}: {e}")
        
        if max_hadiths and processed_total >= max_hadiths:
            break
            
        # Throttling to keep Ollama and DB healthy
        time.sleep(0.5)

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=10)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    hadith_atomization_flow(batch_size=args.batch, max_hadiths=args.limit)
