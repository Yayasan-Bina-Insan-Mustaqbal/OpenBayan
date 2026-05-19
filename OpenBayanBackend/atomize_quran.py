import os
import re
import requests
from typing import List, Dict, Any, Optional
from surrealdb import Surreal, RecordID
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "mxbai-embed-large:latest")

def strip_tashkeel(text: str) -> str:
    """Strips all Arabic diacritics (tashkeel) from the given text."""
    if not text:
        return ""
    # Diacritics and Waqf marks
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

@task(name="atomize-ayah-task")
def atomize_ayah(ayah: Dict[str, Any]):
    logger = get_run_logger()
    text = ayah.get("uthmani_text", "")
    if not text: return
    
    # Split by Waqf marks: ۚ ۗ ۖ ۛ ۜ ۝
    # Using findall to keep the mark at the end of each segment
    segments = re.findall(r'[^ۚۗۖۛۜ۝]+[ۚۗۖۛۜ۝]?', text)
    segments = [s.strip() for s in segments if s.strip()]
    
    if not segments:
        segments = [text.strip()]

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        for idx, segment in enumerate(segments):
            clean_segment = strip_tashkeel(segment)
            embedding = get_embedding(clean_segment)
            
            if not embedding:
                logger.warning(f"Skipping segment due to embedding failure: {clean_segment[:20]}...")
                continue
                
            sent_id = f"sentence:quran_{ayah['surah_number']}_{ayah['ayah_number']}_s{idx}"
            
            db.query("""
                UPSERT type::record($id) SET
                    text = $text,
                    simple_clean_text = $clean,
                    embedding = $embed,
                    parent = $parent,
                    source = source:quran_uthmani,
                    chunk_index = $idx,
                    transliterations = {
                        en: "",
                        ru: "",
                        tr: ""
                    },
                    created_at = time::now();
            """, {
                "id": sent_id,
                "text": segment,
                "clean": clean_segment,
                "embed": embedding,
                "parent": ayah["id"],
                "idx": idx
            })
            
    return len(segments)

@flow(name="Quran Atomization Flow")
def quran_atomization_flow(limit: Optional[int] = None):
    logger = get_run_logger()
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        logger.info("Fetching Ayahs from SurrealDB...")
        # Only process ayahs that haven't been atomized yet (optional: add a flag)
        res = db.query("SELECT * FROM ayah ORDER BY surah_number ASC, ayah_number ASC")
        ayahs = res if isinstance(res, list) else []
        
    if limit:
        ayahs = ayahs[:limit]
        
    logger.info(f"Starting atomization for {len(ayahs)} ayahs...")
    
    total_segments = 0
    for ayah in ayahs:
        count = atomize_ayah(ayah)
        total_segments += count
        if ayah['ayah_number'] % 50 == 0:
            logger.info(f"Processed Surah {ayah['surah_number']} Ayah {ayah['ayah_number']}...")
            
    logger.info(f"Finished! Total sentences created: {total_segments}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None, help="Limit number of ayahs")
    args = parser.parse_args()
    quran_atomization_flow(limit=args.limit)
