import os
import re
import requests
import hashlib
from typing import List, Optional, Dict
from pydantic import BaseModel, Field
from surrealdb import Surreal, RecordID
from prefect import flow, task, get_run_logger
from prefect.task_runners import ThreadPoolTaskRunner
from dotenv import load_dotenv

load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USER", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASS", "RwAbXjBc2z36z")
SURREAL_NS = "openbayan"
SURREAL_DB = "openbayan"

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
OLLAMA_MODEL = "qwen2.5:7b"

class EnrichmentData(BaseModel):
    root: str = Field(description="The triliteral/quadriliteral Arabic root")
    entities: List[str] = Field(default_factory=list, description="Named entities found in the text")
    pos: str = Field(description="Part of speech (Noun, Verb, etc.)")
    simple_text: str = Field(description="Text without Tashkeel/vowels")

def clean_arabic(text: str) -> str:
    # Remove Tashkeel and extra characters
    tashkeel = re.compile(r'[\u0617-\u061A\u064B-\u0652]')
    text = re.sub(tashkeel, "", text)
    return text

@task(retries=3, retry_delay_seconds=5)
def enrich_single_entry(sentence_id: str, text: str, word: str):
    logger = get_run_logger()
    
    prompt = f"""
    Analyze this Arabic dictionary entry:
    Word: {word}
    Definition: {text}
    
    Extract:
    1. The Arabic Root (triliteral/quadriliteral).
    2. Any Named Entities (People, Places, Concepts) mentioned in the definition.
    3. Part of Speech (Noun, Verb, Particle).
    
    Return ONLY JSON:
    {{
        "root": "...",
        "entities": ["...", "..."],
        "pos": "...",
        "simple_text": "..."
    }}
    """
    
    try:
        # 1. LLM Analysis
        res = requests.post(f"{OLLAMA_URL}/api/generate", json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }, timeout=60)
        res.raise_for_status()
        data = EnrichmentData.model_validate_json(res.json()["response"])
        
        # 2. Simple Cleaning fallback
        if not data.simple_text:
            data.simple_text = clean_arabic(text)
            
        # 3. Update Database
        with Surreal(SURREAL_URL) as db:
            db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
            db.use(SURREAL_NS, SURREAL_DB)
            
            # Update Word Root
            root_rid = RecordID("root", data.root)
            db.query("UPSERT $id SET arabic_root = $r, identifier = $r", {"id": root_rid, "r": data.root})
            db.query("UPDATE $wid SET root = $rid, pos = $pos", {"wid": RecordID("word", word), "rid": root_rid, "pos": data.pos})
            
            # Update Sentence Enrichment
            db.query("""
                UPDATE $sid SET 
                    simple_clean_text = $simple,
                    metadata.pos = $pos;
            """, {"sid": RecordID("sentence", sentence_id), "simple": data.simple_text, "pos": data.pos})
            
            # Link Entities
            for ent_name in data.entities:
                ent_slug = re.sub(r'[^\w]', '_', ent_name)
                ent_rid = RecordID("entity", ent_slug)
                db.query("""
                    UPSERT $id SET name = $n, type = 'Concept';
                    RELATE $sid->mentions->$id;
                """, {"id": ent_rid, "n": ent_name, "sid": RecordID("sentence", sentence_id)})
                
        return True
    except Exception as e:
        logger.error(f"Enrichment Failed for {word}: {e}")
        return False

@flow(name="Enrich Dictionary Knowledge", task_runner=ThreadPoolTaskRunner(max_workers=10))
def dictionary_enrichment_flow():
    logger = get_run_logger()
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        # Select Murad entries that haven't been enriched (missing simple_clean_text)
        # Note: We query the relationship defines to get both the sentence and the word
        query = """
            SELECT out as word_id, in as sent_id, in.text as text, out.text as word_text 
            FROM defines 
            WHERE in.source = source:murad_dataset_2026 
            AND in.simple_clean_text = NONE 
            LIMIT 1000
        """
        results = db.query(query)
        entries = results[0]["result"] if results else []
        
        if not entries:
            logger.info("No entries pending enrichment.")
            return

        logger.info(f"Enriching {len(entries)} dictionary entries...")
        
        futures = []
        for row in entries:
            # Extract the ID strings from RecordIDs
            s_id = row["sent_id"].id
            w_txt = row["word_text"]
            text = row["text"]
            futures.append(enrich_single_entry.submit(s_id, text, w_txt))
            
        for f in futures:
            f.result()

    logger.info("Enrichment batch complete.")

if __name__ == "__main__":
    dictionary_enrichment_flow()
