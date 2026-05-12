import os
import re
import requests
import hashlib
from typing import List, Optional, Dict
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

SYSTEM_PROMPT = """
You are an expert in Arabic Linguistics and Islamic Sciences. Your task is to analyze Arabic dictionary entries and extract structured scholarly metadata.
For each entry, you MUST return a valid JSON object with EXACTLY these keys:
- "root": A single string representing the Arabic root (e.g., "خ-ل-ف" or "خلف"). Do NOT return a list.
- "entities": A list of strings for entities mentioned in the definition.
- "is_entity": A boolean (true/false) indicating if the word itself is a significant entity/concept.
- "entity_type": A string (Person, Place, Concept, or Group) if is_entity is true.
- "pos": A string for Part of Speech (Noun, Verb, or Particle).
- "simple_text": A string of the word without Tashkeel.

Return ONLY the JSON object. No preamble or explanation.
"""

from pydantic import BaseModel, Field, AliasChoices, ConfigDict, field_validator

class EnrichmentData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    root: str = Field(validation_alias=AliasChoices("root", "Root", "Arabic Root", "arabic_root"))
    entities: List[str] = Field(default_factory=list, validation_alias=AliasChoices("entities", "Entities", "Named Entities", "named_entities"))
    is_entity: bool = Field(default=False, validation_alias=AliasChoices("is_entity", "Is Entity", "is_named_entity"))
    entity_type: Optional[str] = Field(None, validation_alias=AliasChoices("entity_type", "Entity Type", "type"))
    pos: str = Field(validation_alias=AliasChoices("pos", "POS", "Part of Speech", "part_of_speech"))
    simple_text: str = Field(validation_alias=AliasChoices("simple_text", "Simple Text", "text_clean"))

    @field_validator("root", mode="before")
    @classmethod
    def join_root(cls, v):
        if isinstance(v, list):
            return "-".join(v)
        return v

def clean_arabic(text: str) -> str:
    # Remove Tashkeel and extra characters
    tashkeel = re.compile(r'[\u0617-\u061A\u064B-\u0652]')
    text = re.sub(tashkeel, "", text)
    return text

@task(retries=3, retry_delay_seconds=5)
def enrich_single_entry(sentence_id: str, text: str, word: str):
    logger = get_run_logger()
    
    prompt = f"""
    Extract:
    1. The Arabic Root (triliteral/quadriliteral).
    2. Any Named Entities (People, Places, Concepts) mentioned in the definition.
    3. Is the Word itself ({word}) a Named Entity or a significant Islamic Concept? (e.g. Prophet, Place, Sect, or terms like 'Khilafah', 'Salah', 'Zakat')
    4. Part of Speech (Noun, Verb, Particle).
    
    Return ONLY JSON matching the EnrichmentData schema.
    """
    
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Word: {word}\nDefinition: {text}"}
        ],
        "stream": False,
        "format": "json"
    }
    
    data = None
    try:
        response = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=120)
        response.raise_for_status()
        res_json = response.json()
        data = EnrichmentData.model_validate_json(res_json["message"]["content"])
        logger.info(f"DEBUG: {word} -> Root: {data.root}, Entity: {data.is_entity} ({data.entity_type}), POS: {data.pos}")
    except Exception as e:
        logger.error(f"LLM/Parsing Failed for {word}: {e}")
        # Create a dummy object to proceed with DB fallback if possible, or raise
        data = EnrichmentData(root="unknown", pos="unknown", simple_text=clean_arabic(text))

    try:
        # 2. Simple Cleaning fallback
        if not data.simple_text:
            data.simple_text = clean_arabic(text)
            
        # 3. Update Database
        with Surreal(SURREAL_URL) as db:
            db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
            db.use(SURREAL_NS, SURREAL_DB)
            
            # 3. Update Word Root and Entity Mapping
            root_rid = RecordID("root", data.root)
            db.query("UPSERT $id SET arabic_root = $r, identifier = $r", {"id": root_rid, "r": data.root})
            
            # Entity Analysis for the Word itself
            word_entity_rid = None
            if data.is_entity:
                ent_slug = re.sub(r'[^\w]', '_', word)
                word_entity_rid = RecordID("entity", ent_slug)
                
                # Fetch Wikipedia metadata using simple text
                wiki = {"url": "", "summary": ""}
                w_url = "https://ar.wikipedia.org/api/rest_v1/page/summary/" + requests.utils.quote(data.simple_text)
                headers = {"User-Agent": "OpenBayan-Bot/1.0 (https://openbayan.org; info@openbayan.org)"}
                try:
                    w_res = requests.get(w_url, headers=headers, timeout=10)
                    logger.info(f"Wikipedia Status for {data.simple_text}: {w_res.status_code}")
                    if w_res.status_code == 200:
                        w_data = w_res.json()
                        wiki = {
                            "url": w_data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                            "summary": w_data.get("extract", "")
                        }
                        logger.info(f"Wikipedia Found: {wiki['url']}")
                    else:
                        logger.warning(f"Wikipedia Not Found for {data.simple_text} (URL: {w_url})")
                except: pass
                
                db.query("""
                    UPSERT $id SET name = $n, type = $t, wikipedia_url = $url, summary = $s;
                """, {"id": word_entity_rid, "n": word, "t": data.entity_type or "Concept", "url": wiki["url"], "s": wiki["summary"]})

            db.query("UPDATE $wid SET root = $rid, pos = $pos, refers_to = $ref", {
                "wid": RecordID("word", word), 
                "rid": root_rid, 
                "pos": data.pos,
                "ref": word_entity_rid
            })
            
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
        """
        logger.info("Executing query...")
        results = db.query(query)
        
        entries = []
        if isinstance(results, list):
            # If the first element is a dict with 'sent_id', results is our list
            if len(results) > 0 and isinstance(results[0], dict) and "sent_id" in results[0]:
                entries = results
            # If the first element is a list, it's a result set
            elif len(results) > 0 and isinstance(results[0], list):
                entries = results[0]
        
        if not entries:
            logger.info("No entries pending enrichment.")
            return

        logger.info(f"Enriching {len(entries)} dictionary entries...")
        
        futures = []
        for row in entries:
            # Handle RecordID as string or object
            s_id_raw = str(row["sent_id"])
            s_id = s_id_raw.split(":")[1] if ":" in s_id_raw else s_id_raw
            w_txt = row["word_text"]
            text = row["text"]
            futures.append(enrich_single_entry.submit(s_id, text, w_txt))
            
        for f in futures:
            f.result()

    logger.info("Enrichment batch complete.")

if __name__ == "__main__":
    dictionary_enrichment_flow()
