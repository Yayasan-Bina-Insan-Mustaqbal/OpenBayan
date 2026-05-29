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

def execute_sql(sql: str, retries: int = 5, backoff: float = 2.0):
    for attempt in range(retries):
        try:
            res = requests.post(
                SURREAL_URL, 
                auth=SURREAL_AUTH, 
                headers=SURREAL_HEADERS, 
                data=sql.encode('utf-8'), 
                timeout=15
            )
            if res.status_code != 200:
                raise Exception(f"SurrealDB Error: {res.text}")
            return res.json()
        except requests.exceptions.RequestException as e:
            if attempt == retries - 1:
                raise e
            time.sleep(backoff * (2 ** attempt))

@task(name="Atomize Tafsir Task")
def atomize_tafsir_task(ayah: Dict[str, Any], tafsir_key: str):
    logger = get_run_logger()
    
    # Extract the specific tafsir text from the object
    tafsir_data = ayah.get("tafsir", {})
    text = tafsir_data.get(tafsir_key, "")
    
    if not text or len(text.strip()) < 10:
        return 0
    
    # 1. Cleaning: Strip HTML tags (common in quran.com data)
    clean_html = re.sub(r'<[^>]+>', '', text)
    
    # 2. Chunking Logic: Split by Arabic punctuation
    chunks = re.split(r'(?<=[.؟!])\s+', clean_html)
    chunks = [c.strip() for c in chunks if c.strip()]
    
    # Fallback: if one giant block, split by length ~400 chars
    if len(chunks) == 1 and len(chunks[0]) > 500:
        # Recursive-ish split by spaces to avoid cutting words
        words = chunks[0].split()
        chunks = [" ".join(words[i:i+80]) for i in range(0, len(words), 80)]

    queries = ["BEGIN TRANSACTION;"]
    
    ayah_id = str(ayah['id']) # e.g. ayah:⟨1_1⟩
    s_num = ayah['surah_number']
    a_num = ayah['ayah_number']
    
    source_id = f"source:tafsir_{tafsir_key}"

    for idx, segment in enumerate(chunks):
        if len(segment) < 10: continue
        
        clean_segment = strip_tashkeel(segment)
        embedding = get_embedding(clean_segment)
        
        if not embedding:
            continue
            
        # Composite ID: sentence:⟨tafsir_saddi_1_1_s0⟩
        sent_id = f"sentence:⟨tafsir_{tafsir_key}_{s_num}_{a_num}_s{idx}⟩"
        
        safe_text = segment.replace("'", "\\'")
        safe_clean = clean_segment.replace("'", "\\'")
        
        q = f"""
            UPSERT {sent_id} SET
                text = '{safe_text}',
                simple_clean_text = '{safe_clean}',
                embedding = {json.dumps(embedding)},
                parent = {ayah_id},
                source = {source_id},
                chunk_index = {idx},
                transliterations = {{ en: "", ru: "", tr: "" }},
                created_at = time::now();
        """
        queries.append(q)
    
    # Mark this specific tafsir as processed in a metadata field or separate table?
    # For now, we use a simple flag in the ayah record or just trust the UPSERT.
    queries.append("COMMIT TRANSACTION;")
    
    if len(queries) > 2:
        execute_sql("\n".join(queries))
    return len(chunks)

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

@flow(name="Tafsir Atomization Flow")
def tafsir_atomization_flow(tafsir_key: str = "ar_saddi", batch_size: int = 50, limit: Optional[int] = None):
    logger = get_run_logger()
    logger.info(f"Bismillah. Starting Tafsir atomization for: {tafsir_key}")

    job_key = f"atomize_tafsir_{tafsir_key}.py"
    source_id = f"source:tafsir_{tafsir_key}"

    # Ensure source record exists
    try:
        execute_sql(f"""
            UPSERT {source_id} SET
                name = 'Tafsir: {tafsir_key}',
                lang = '{tafsir_key[:2]}',
                type = 'tafsir',
                key = '{tafsir_key}',
                created_at = time::now();
        """)
    except Exception as e:
        logger.warning(f"Could not upsert source record: {e}")

    total_ayahs = 6236
    try:
        res = execute_sql(
            f"SELECT count() FROM ayah WHERE tafsir.{tafsir_key} != NONE "
            f"AND tafsir.{tafsir_key} != '' GROUP ALL;"
        )
        if res and res[0].get('result'):
            total_ayahs = res[0]['result'][0]['count']
    except Exception as e:
        logger.warning(f"Could not fetch total tafsir count: {e}")

    # Count already processed using a per-tafsir boolean flag field
    processed_existing = 0
    safe_key = tafsir_key.replace("-", "_")
    try:
        res = execute_sql(
            f"SELECT count() FROM ayah "
            f"WHERE processed_tafsir__{safe_key} = true GROUP ALL;"
        )
        if res and res[0].get('result'):
            processed_existing = res[0]['result'][0]['count']
        logger.info(f"Found {processed_existing} ayahs already processed for tafsir '{tafsir_key}'.")
    except Exception as e:
        logger.warning(f"Could not fetch processed count: {e}")

    start_time = time.time()
    processed_total = 0
    offset = 0

    update_progress_state(job_key, processed_existing, total_ayahs, 0, 0)

    while True:
        # Fetch unprocessed ayahs for this tafsir — use per-key boolean flag
        res = execute_sql(
            f"SELECT * FROM ayah "
            f"WHERE tafsir.{tafsir_key} != NONE AND tafsir.{tafsir_key} != '' "
            f"AND processed_tafsir__{safe_key} != true "
            f"LIMIT {batch_size};"
        )
        batch = res[0].get('result', [])

        if not batch:
            logger.info(f"Alhamdulillah! Finished processing all Tafsir '{tafsir_key}' records.")
            update_progress_state(job_key, total_ayahs, total_ayahs, 0, 0)
            break

        for ayah in batch:
            try:
                atomize_tafsir_task(ayah, tafsir_key)
                # Mark this tafsir key as processed using a per-key boolean field
                ayah_id = str(ayah['id'])
                execute_sql(
                    f"UPDATE {ayah_id} SET processed_tafsir__{safe_key} = true;"
                )
                processed_total += 1

                count = processed_existing + processed_total
                elapsed = time.time() - start_time
                speed = (processed_total / elapsed) * 60 if elapsed > 0 else 0
                eta = ((total_ayahs - count) / speed) * 60 if speed > 0 else 0
                update_progress_state(job_key, count, total_ayahs, speed, eta)

                if processed_total % 100 == 0:
                    logger.info(f"[{tafsir_key}] Progress: {processed_total} Ayahs processed.")
            except Exception as e:
                logger.error(f"[{tafsir_key}] Failed Ayah {ayah['id']}: {e}")

        if limit and processed_total >= limit:
            break

        time.sleep(0.2)  # Throttle between batches

    logger.info(f"[{tafsir_key}] Done. Total Ayahs processed: {processed_total}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--tafsir", type=str, default="ar_saddi", help="Tafsir slug (e.g. ar_saddi, ar_mukhtasar)")
    parser.add_argument("--batch", type=int, default=50)
    parser.add_argument("--limit", type=int, default=None, help="Max number of ayahs to process")
    args = parser.parse_args()
    tafsir_atomization_flow(tafsir_key=args.tafsir, batch_size=args.batch, limit=args.limit)
