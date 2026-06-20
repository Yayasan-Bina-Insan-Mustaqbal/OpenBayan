import os
import re
import json
import time
import requests
from typing import List, Dict, Any, Optional
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

try:
    import torch
    from transformers import AutoTokenizer, AutoModelForTokenClassification
    HAS_AI_LIBS = True
except ImportError:
    HAS_AI_LIBS = False

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

def find_matn_start_regex(raw_text: str) -> int:
    anchors = [
        r"قَالَا?",
        r"يَقُولُ?",
        r"فَقَالَا?",
        r"سَمِعْتُ?",
    ]
    anchor_pattern = (
        r"(" + "|".join(anchors) + r")" 
        r"[\s\w\d\(\)\[\]\.\-\{\}ﷺ]*?" 
        r"(?:أنَّ|ان|بِأَنَّ|عَنْ|أَنَّهُ)?" 
        r"[\s:]+"
    )
    tashkeel_chars = re.compile(r'[\u0617-\u061A\u064B-\u0652\u0670]')
    stripped_text = ""
    index_map = []
    
    for raw_idx, char in enumerate(raw_text):
        if not tashkeel_chars.match(char):
            stripped_text += char
            index_map.append(raw_idx)
            
    normalized_text = (
        stripped_text.replace("أ", "ا")
                     .replace("إ", "ا")
                     .replace("آ", "ا")
    )
    match = re.search(anchor_pattern, normalized_text)
    if match:
        stripped_end_idx = match.end()
        if stripped_end_idx < len(index_map):
            return index_map[stripped_end_idx]
        else:
            return len(raw_text)
    return -1

def get_matn_boundary(text: str) -> int:
    idx = find_matn_start_regex(text)
    if idx != -1:
        return idx
    return -1

def execute_sql(sql: str, retries: int = 5, backoff: float = 2.0) -> List[Dict]:
    for attempt in range(retries):
        try:
            res = requests.post(SURREAL_URL, auth=(SURREAL_USER, SURREAL_PASS), headers=SURREAL_HEADERS, data=sql.encode('utf-8'), timeout=180)
            if res.status_code != 200:
                raise Exception(f"SurrealDB Error: {res.text}")
            return res.json()
        except requests.exceptions.RequestException as e:
            if attempt == retries - 1:
                raise e
            time.sleep(backoff * (2 ** attempt))

def get_embeddings_bulk(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    payload = {"model": OLLAMA_EMBED_MODEL, "input": texts}
    try:
        res = requests.post(f"{OLLAMA_URL}/api/embed", json=payload, timeout=120)
        res.raise_for_status()
        data = res.json()
        return data.get("embeddings", [])
    except Exception as e:
        print(f"Ollama bulk embed error: {e}")
        return []

def update_progress_state(job_name: str, count: int, total: int, speed: float = 0, eta: float = 0):
    try:
        paths = [
            "/app/notebooks/flows/ingestion_state.json",
            os.path.join(os.path.dirname(__file__), 'ingestion_state.json'),
            "ingestion_state.json"
        ]
        
        state_file = next((p for p in paths if os.path.exists(os.path.dirname(p)) or os.path.dirname(p) == ''), "ingestion_state.json")
            
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
            "eta": eta if eta > 0 else None,
            "time": time.time()
        }
        
        with open(state_file, 'w') as f:
            json.dump(state, f, indent=2)
    except Exception as e:
        pass

@task(name="Batched Hadith Atomization Task")
def process_hadith_batch(batch: List[Dict[str, Any]]):
    logger = get_run_logger()
    all_chunks = []
    hadiths_processed = []

    for hadith in batch:
        hid_raw = str(hadith['id'])
        hid_inner = hid_raw.split(':')[-1].replace('⟨', '').replace('⟩', '').replace('`', '')
        
        isnad_part = hadith.get("isnad", "")
        matn_part = hadith.get("main_full", "") or hadith.get("matn_ar", "")
        
        if not isnad_part and matn_part:
            boundary_idx = get_matn_boundary(matn_part)
            if boundary_idx != -1:
                isnad_part = matn_part[:boundary_idx]
                matn_part = matn_part[boundary_idx:]
                
        if not matn_part:
            hadiths_processed.append((hid_raw, isnad_part))
            continue
            
        sentences = re.split(r'(?<=[.؟!])\s+', matn_part)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences or len(sentences) == 1:
            if len(matn_part) > 250:
                sentences = re.split(r'(?<=[\s])(وقال|فقال|ثم|فإذا|فذكر|فحدث)\s+', matn_part)
                refined = []
                for i in range(0, len(sentences), 2):
                    if i+1 < len(sentences):
                        refined.append(sentences[i] + sentences[i+1])
                    else:
                        refined.append(sentences[i])
                sentences = [s.strip() for s in refined if s.strip()]
                
        if not sentences:
            sentences = [matn_part.strip()]
            
        hadiths_processed.append((hid_raw, isnad_part))
        for idx, segment in enumerate(sentences):
            if len(segment) < 5: continue
            clean_segment = strip_tashkeel(segment)
            all_chunks.append((hid_raw, hid_inner, idx, segment, clean_segment))

    BATCH_SIZE = 32
    
    for i in range(0, len(all_chunks), BATCH_SIZE):
        upsert_queries = ["BEGIN TRANSACTION;"]
        chunk_batch = all_chunks[i:i+BATCH_SIZE]
        texts_to_embed = [c[4] for c in chunk_batch]
        
        embeddings = [None] * len(texts_to_embed)

            
        for (hid_raw, hid_inner, idx, segment, clean_segment), emb in zip(chunk_batch, embeddings):
            
            
            sent_id = f"sentence:⟨hadith_{hid_inner}_s{idx}⟩"
            safe_text = segment.replace("'", "\\'")
            safe_clean = clean_segment.replace("'", "\\'")
            source_id = "source:hadith_650k_sanadset"
            
            q = f"""
                UPSERT {sent_id} SET
                    text = '{safe_text}',
                    simple_clean_text = '{safe_clean}',
                    embedding = NONE,
                    parent = {hid_raw},
                    source = {source_id},
                    chunk_index = {idx},
                    transliterations = {{ en: "", ru: "", tr: "" }},
                    created_at = time::now();
            """
            upsert_queries.append(q)
            
        upsert_queries.append("COMMIT TRANSACTION;")
        if len(upsert_queries) > 2:
            execute_sql("\n".join(upsert_queries))

    upsert_queries = ["BEGIN TRANSACTION;"]
    for hid_raw, isnad_part in hadiths_processed:
        if isnad_part:
            safe_isnad = isnad_part.replace("'", "\\'")
            upsert_queries.append(f"UPDATE {hid_raw} SET isnad = '{safe_isnad}';")
        upsert_queries.append(f"UPDATE {hid_raw} SET processed_for_sentences = true;")

    upsert_queries.append("COMMIT TRANSACTION;")
    
    if len(upsert_queries) > 2:
        execute_sql("\n".join(upsert_queries))

@flow(name="Batched Hybrid Hadith Atomization")
def enterprise_hadith_flow(batch_size: int = 250, limit: Optional[int] = None):
    logger = get_run_logger()
    logger.info("Bismillahir Rahmanir Rahim. Starting Synchronous GPU Batched Hadith Atomization v6...")
    
    try:
        res = execute_sql("SELECT count() FROM hadith GROUP ALL;")
        total_hadiths = res[0]['result'][0]['count'] if res and res[0].get('result') else 739676
    except Exception as e:
        logger.warning(f"Error getting total count: {e}")
        total_hadiths = 739676
        
    try:
        res = execute_sql("SELECT count() FROM hadith WHERE processed_for_sentences = true GROUP ALL;")
        processed_existing = res[0]['result'][0]['count'] if res and res[0].get('result') else 0
    except Exception as e:
        logger.warning(f"Error getting processed count: {e}")
        processed_existing = 0
    
    start_time = time.time()
    processed_total = 0
    
    update_progress_state("atomize_hadith_v5.py", processed_existing, total_hadiths, 0, 0)
    
    while True:
        res = execute_sql(f"SELECT * FROM hadith WHERE processed_for_sentences != true LIMIT {batch_size}")
        batch = res[0].get('result', [])
        
        if not batch:
            logger.info("Alhamdulillah! Ingestion complete.")
            update_progress_state("atomize_hadith_v5.py", total_hadiths, total_hadiths, 0, 0)
            break
            
        process_hadith_batch(batch)
        processed_total += len(batch)
        
        count = processed_existing + processed_total
        elapsed = time.time() - start_time
        speed = (processed_total / elapsed) * 60 if elapsed > 0 else 0
        eta = ((total_hadiths - count) / speed) * 60 if speed > 0 else 0
        update_progress_state("atomize_hadith_v5.py", count, total_hadiths, speed, eta)
        
        logger.info(f"Progress: {processed_total} hadiths atomized. Speed: {speed:.1f} records/min")
        
        if limit and processed_total >= limit:
            break

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=250)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    enterprise_hadith_flow(batch_size=args.batch, limit=args.limit)
