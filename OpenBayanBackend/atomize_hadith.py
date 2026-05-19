import os
import re
import requests
import time
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

@task(name="atomize-hadith-task")
def atomize_hadith(hadith: Dict[str, Any]):
    logger = get_run_logger()
    text = hadith.get("matn_ar", "")
    if not text: return 0
    
    # Simple sentence splitter for Arabic
    # Look for periods, question marks, etc followed by space or end of string
    sentences = re.split(r'(?<=[.؟!])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if not sentences:
        sentences = [text.strip()]

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        for idx, segment in enumerate(sentences):
            # Only embed segments with enough content
            if len(segment) < 5: continue
            
            clean_segment = strip_tashkeel(segment)
            embedding = get_embedding(clean_segment)
            
            if not embedding:
                continue
                
            # Create a unique ID for the sentence
            # Sanitize hadith ID for use in sentence ID
            hid_str = str(hadith['id']).replace('hadith:', '')
            sent_id = f"sentence:hadith_{hid_str}_s{idx}"
            
            db.query("""
                UPSERT type::record($id) SET
                    text = $text,
                    simple_clean_text = $clean,
                    embedding = $embed,
                    parent = $parent,
                    source = source:hadith_650k_sanadset,
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
                "parent": hadith["id"],
                "idx": idx
            })
            
    return len(sentences)

@flow(name="Hadith Atomization Flow")
def hadith_atomization_flow(batch_size: int = 100, max_hadiths: Optional[int] = None):
    logger = get_run_logger()
    
    processed_total = 0
    
    while True:
        with Surreal(SURREAL_URL) as db:
            db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
            db.use(SURREAL_NS, SURREAL_DB)
            
            # Fetch batch of unprocessed hadiths
            res = db.query(f"SELECT * FROM hadith WHERE processed_for_kg != true LIMIT {batch_size}")
            batch = res if isinstance(res, list) else []
            
            if not batch:
                logger.info("No more unprocessed hadiths found.")
                break
                
            logger.info(f"Processing batch of {len(batch)} hadiths (Total processed: {processed_total})...")
            
            for hadith in batch:
                try:
                    atomize_hadith(hadith)
                    db.query("UPDATE $id SET processed_for_kg = true", {"id": hadith["id"]})
                    processed_total += 1
                except Exception as e:
                    logger.error(f"Error processing hadith {hadith['id']}: {e}")
            
            if max_hadiths and processed_total >= max_hadiths:
                logger.info(f"Reached limit of {max_hadiths} hadiths.")
                break
                
    logger.info(f"Finished! Total hadiths atomized: {processed_total}")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=100, help="Batch size")
    parser.add_argument("--limit", type=int, default=None, help="Max hadiths to process")
    args = parser.parse_args()
    hadith_atomization_flow(batch_size=args.batch, max_hadiths=args.limit)
