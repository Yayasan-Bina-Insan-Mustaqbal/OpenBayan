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
SURREAL_SQL_URL = "http://192.168.100.33:8000/sql"
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
        print(f"Embedding failed: {e}")
        return None

def execute_sql(sql: str):
    res = requests.post(SURREAL_SQL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=sql.encode('utf-8'))
    if res.status_code != 200:
        raise Exception(f"SurrealDB Error: {res.text}")
    return res.json()

@task(name="atomize-hadith-task-v2")
def atomize_hadith(hadith: Dict[str, Any]):
    logger = get_run_logger()
    text = hadith.get("matn_ar", "")
    if not text: return 0
    
    # Split by common Arabic punctuation
    sentences = re.split(r'(?<=[.؟!])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        sentences = [text.strip()]

    queries = ["BEGIN TRANSACTION;"]
    
    for idx, segment in enumerate(sentences):
        if len(segment) < 5: continue
        
        clean_segment = strip_tashkeel(segment)
        embedding = get_embedding(clean_segment)
        
        if not embedding:
            continue
            
        # Extract record ID part
        hid_parts = str(hadith['id']).split(':')
        hid_str = hid_parts[1] if len(hid_parts) > 1 else hid_parts[0]
        # Remove brackets if any (some IDs in logs had them)
        hid_str = hid_str.replace('⟨', '').replace('⟩', '')
        
        sent_id = f"sentence:hadith_{hid_str}_s{idx}"
        
        safe_text = segment.replace("'", "\\'")
        safe_clean = clean_segment.replace("'", "\\'")
        
        q = f"""
            UPSERT sentence:`{sent_id}` SET
                text = '{safe_text}',
                simple_clean_text = '{safe_clean}',
                embedding = {json.dumps(embedding)},
                parent = {hadith['id']},
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
    
    # Mark parent as processed in the same transaction
    queries.append(f"UPDATE {hadith['id']} SET processed_for_kg = true;")
    queries.append("COMMIT TRANSACTION;")
    
    execute_sql("\n".join(queries))
            
    return len(sentences)

@flow(name="Hadith Atomization Flow v2")
def hadith_atomization_flow(batch_size: int = 50, max_hadiths: Optional[int] = None):
    logger = get_run_logger()
    
    processed_total = 0
    
    while True:
        logger.info(f"Fetching batch of {batch_size} unprocessed hadiths...")
        res = execute_sql(f"SELECT * FROM hadith WHERE processed_for_kg != true LIMIT {batch_size}")
        batch = res[0]['result']
        
        if not batch:
            logger.info("No more unprocessed hadiths found.")
            break
            
        logger.info(f"Processing batch... (Total processed so far: {processed_total})")
        
        for hadith in batch:
            try:
                atomize_hadith(hadith)
                processed_total += 1
            except Exception as e:
                logger.error(f"Failed hadith {hadith['id']}: {e}")
        
        if max_hadiths and processed_total >= max_hadiths:
            logger.info(f"Reached limit of {max_hadiths} hadiths.")
            break
                
    logger.info(f"Finished! Total hadiths atomized: {processed_total}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=50, help="Batch size")
    parser.add_argument("--limit", type=int, default=None, help="Max hadiths to process")
    args = parser.parse_args()
    hadith_atomization_flow(batch_size=args.batch, max_hadiths=args.limit)
