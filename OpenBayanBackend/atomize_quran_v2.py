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
        embedding = get_embedding(clean_segment)
        
        if not embedding:
            continue
            
        sent_id = f"sentence:quran_{ayah['surah_number']}_{ayah['ayah_number']}_s{idx}"
        
        # Escape single quotes in text
        safe_text = segment.replace("'", "\\'")
        safe_clean = clean_segment.replace("'", "\\'")
        
        q = f"""
            UPSERT sentence:`{sent_id}` SET
                text = '{safe_text}',
                simple_clean_text = '{safe_clean}',
                embedding = {json.dumps(embedding)},
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

@flow(name="Quran Atomization Flow v2")
def quran_atomization_flow(limit: Optional[int] = None):
    logger = get_run_logger()
    
    logger.info("Fetching Ayahs from SurrealDB...")
    # Fetch ayahs via HTTP
    res = execute_sql("SELECT * FROM ayah ORDER BY surah_number ASC, ayah_number ASC")
    ayahs = res[0]['result']
        
    if limit:
        ayahs = ayahs[:limit]
        
    logger.info(f"Starting atomization for {len(ayahs)} ayahs...")
    
    total_segments = 0
    for ayah in ayahs:
        try:
            count = atomize_ayah(ayah)
            total_segments += count
            if ayah['ayah_number'] % 50 == 0:
                logger.info(f"Processed Surah {ayah['surah_number']} Ayah {ayah['ayah_number']} (Total Sents: {total_segments})")
        except Exception as e:
            logger.error(f"Failed Surah {ayah['surah_number']} Ayah {ayah['ayah_number']}: {e}")
            
    logger.info(f"Finished! Total sentences created: {total_segments}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Limit number of ayahs")
    args = parser.parse_args()
    quran_atomization_flow(limit=args.limit)
