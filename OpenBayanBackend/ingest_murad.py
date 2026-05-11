import os
import csv
import re
import requests
from typing import List, Optional
from dotenv import load_dotenv
from surrealdb import Surreal, RecordID
from prefect import task, flow, get_run_logger
from prefect.task_runners import ThreadPoolTaskRunner

# Load configuration
load_dotenv()
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "mxbai-embed-large:latest")

CSV_PATH = "data/murad/data/rd_dataset.csv"
SOURCE_ID = "source:murad_dataset_2026"

def clean_id(text: str) -> str:
    if not text: return ""
    return re.sub(r'[^\w]', '_', text).strip('_')

@task(name="generate-embedding", retries=3, retry_delay_seconds=15)
def get_embedding(text: str) -> Optional[List[float]]:
    if not text: return None
    payload = {"model": OLLAMA_EMBED_MODEL, "prompt": text}
    try:
        response = requests.post(f"{OLLAMA_URL}/api/embeddings", json=payload, timeout=90)
        response.raise_for_status()
        return response.json()["embedding"]
    except Exception as e:
        return None

@task(name="ingest-murad-batch")
def ingest_batch(batch: List[dict]):
    logger = get_run_logger()
    source_rid = RecordID("source", "murad_dataset_2026")
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        for row in batch:
            word_txt = row['word'].strip()
            def_txt = row['definition'].strip()
            if not word_txt or not def_txt: continue
            
            try:
                # 1. Handle Root & Word
                root_txt = word_txt[:3] # Simple fallback
                root_rid = RecordID("root", root_txt)
                word_rid = RecordID("word", word_txt)
                
                db.query("UPSERT $id SET arabic_root = $r, identifier = $r", {"id": root_rid, "r": root_txt})
                db.query("UPSERT $id SET text = $w, simple_text = $w, root = $rid", {"id": word_rid, "w": word_txt, "rid": root_rid})
                
                # 2. Handle Definition (Sentence)
                embedding = get_embedding.fn(def_txt)
                if not embedding: continue

                # Use a dummy parent record to satisfy schema
                parent_rid = RecordID("book_section", "murad_all")

                sent_uid = f"murad_{clean_id(word_txt)[:15]}_{hash(def_txt) % 100000}"
                sent_rid = RecordID("sentence", sent_uid)

                db.query("""
                    UPSERT $id SET
                        text = $txt, parent = $pr, source = $src,
                        embedding = $emb, chunk_index = 0,
                        transliterations = {en: "", ru: "", tr: ""};
                    RELATE $id->defines->$wid;
                """, {
                    "id": sent_rid, "txt": def_txt, "pr": parent_rid, "src": source_rid,
                    "emb": embedding, "wid": word_rid
                })
            except Exception as e:
                logger.error(f"Failed to ingest MURAD word [{word_txt}]: {e}")

@flow(name="Ingest MURAD Dataset", task_runner=ThreadPoolTaskRunner(max_workers=10))
def murad_ingestion_flow():
    logger = get_run_logger()
    
    # Ensure Source exists
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        db.query("UPSERT source:murad_dataset_2026 SET title = 'MURAD Reverse Arabic Dictionary', type = 'dataset', author = 'RIOTU Lab', identifier = 'murad_2026', language = 'ar'")

    if not os.path.exists(CSV_PATH):
        logger.error(f"CSV file not found: {CSV_PATH}")
        return

    batch_size = 50
    current_batch = []
    
    with open(CSV_PATH, mode='r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            current_batch.append(row)
            if len(current_batch) >= batch_size:
                ingest_batch.submit(current_batch)
                current_batch = []
        
        if current_batch:
            ingest_batch.submit(current_batch)

if __name__ == "__main__":
    murad_ingestion_flow()
