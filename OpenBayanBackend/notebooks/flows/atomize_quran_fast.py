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

def execute_sql(sql: str, retries: int = 5, backoff: float = 2.0):
    for attempt in range(retries):
        try:
            res = requests.post(
                SURREAL_SQL_URL, 
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

@task(name="atomize-ayah-task")
def atomize_ayah(ayah: Dict[str, Any]):
    logger = get_run_logger()
    text = ayah.get("uthmani_text", "")
    if not text: return 0
    
    segments = re.findall(r'[^ۚۗۖۛۜ۝]+[ۚۗۖۛۜ۝]?', text)
    segments = [s.strip() for s in segments if s.strip()]
    
    if not segments:
        segments = [text.strip()]

    queries = ["BEGIN TRANSACTION;"]
    
    for idx, segment in enumerate(segments):
        clean_segment = strip_tashkeel(segment)
        
        

            
        sent_id = f"sentence:quran_{ayah['surah_number']}_{ayah['ayah_number']}_s{idx}"
        
        # Escape single quotes in text
        safe_text = segment.replace("'", "\\'")
        safe_clean = clean_segment.replace("'", "\\'")
        
        q = f"""
            UPSERT sentence:`{sent_id}` SET
                text = '{safe_text}',
                simple_clean_text = '{safe_clean}',
                is_embedded = false,
                is_translated_en = false,
                parent = {ayah['id']},
                source = source:quran_uthmani,
                chunk_index = {idx},
                transliterations = {{
                    en: "",
                    ru: "",
                    tr: ""
                }},
                created_at = time::now();
        """
        queries.append(q)
    
    queries.append("COMMIT TRANSACTION;")
    
    if len(queries) > 2:
        execute_sql("\n".join(queries))
            
    return len(segments)

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
                pass
                
        state[job_name] = {
            "count": count,
            "total": total,
            "speed": speed,
            "eta": eta,
            "time": time.time()
        }
        
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        print(f"Failed to update progress state: {e}")

@flow(name="Quran Atomization Flow v2")
def quran_atomization_flow(limit: Optional[int] = None):
    logger = get_run_logger()
    
    logger.info("Fetching existing atomized parents from sentence table...")
    try:
        parent_res = execute_sql("SELECT parent FROM sentence WHERE source = source:quran_uthmani GROUP BY parent;")
        existing_parents = set()
        if parent_res and parent_res[0].get("result"):
            for r in parent_res[0]["result"]:
                if r.get("parent"):
                    existing_parents.add(r["parent"])
        logger.info(f"Found {len(existing_parents)} already-atomized Ayahs.")
    except Exception as e:
        logger.warning(f"Could not load existing atomized parents: {e}")
        existing_parents = set()

    logger.info("Fetching Ayahs from SurrealDB...")
    # Fetch ayahs via HTTP
    res = execute_sql("SELECT * FROM ayah ORDER BY surah_number ASC, ayah_number ASC")
    ayahs = res[0]['result']
        
    logger.info(f"Filtering {len(ayahs)} total Ayahs...")
    unprocessed_ayahs = [a for a in ayahs if a['id'] not in existing_parents]
    logger.info(f"Found {len(unprocessed_ayahs)} unprocessed Ayahs remaining.")

    if limit:
        unprocessed_ayahs = unprocessed_ayahs[:limit]
        
    logger.info(f"Starting atomization for {len(unprocessed_ayahs)} ayahs...")
    
    start_time = time.time()
    existing_count = len(existing_parents)
    total_quran_ayahs = 6236
    
    # Initialize progress state
    update_progress_state("atomize_quran_v2.py", existing_count, total_quran_ayahs, speed=0, eta=0)
    
    total_segments = 0
    for idx, ayah in enumerate(unprocessed_ayahs):
        try:
            count = atomize_ayah(ayah)
            total_segments += count
            
            # Compute live metrics
            elapsed = time.time() - start_time
            processed_now = idx + 1
            speed = processed_now / elapsed if elapsed > 0 else 0  # per second
            speed_per_min = speed * 60
            remaining = len(unprocessed_ayahs) - processed_now
            eta = remaining / speed if speed > 0 else 0
            
            update_progress_state(
                "atomize_quran_v2.py",
                existing_count + processed_now,
                total_quran_ayahs,
                speed=speed_per_min,
                eta=eta
            )
            
            if (idx + 1) % 10 == 0 or ayah['ayah_number'] % 50 == 0:
                logger.info(f"Processed {idx + 1}/{len(unprocessed_ayahs)} (Surah {ayah['surah_number']} Ayah {ayah['ayah_number']}, Total Sents: {total_segments})")
        except Exception as e:
            logger.error(f"Failed Surah {ayah['surah_number']} Ayah {ayah['ayah_number']}: {e}")
            
    logger.info(f"Finished! Total sentences created in this run: {total_segments}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Limit number of ayahs")
    args = parser.parse_args()
    quran_atomization_flow(limit=args.limit)
