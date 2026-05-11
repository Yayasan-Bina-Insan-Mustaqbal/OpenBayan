import os
import json
import re
import requests
from typing import List, Optional
from pydantic import BaseModel, Field
from surrealdb import Surreal, RecordID
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_LLM_MODEL", "qwen2.5:7b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "mxbai-embed-large:latest")

# Pydantic models for structured extraction
class EntityMention(BaseModel):
    name: str = Field(description="The name of the entity in Arabic")
    type: str = Field(description="One of: Person, Place, Tribe, Event, Concept")

class DictionaryEntry(BaseModel):
    root: str = Field(description="The 3 or 4 letter Arabic root")
    word: str = Field(description="The specific word or verb form being defined")
    definition: str = Field(description="The full explanation text")
    entities: List[EntityMention] = []

class PageExtraction(BaseModel):
    entries: List[DictionaryEntry]

SYSTEM_PROMPT = """
You are an expert Arabic lexicographer. Your task is to extract structured dictionary entries from the provided text of 'Al-Qamus al-Muhit'.
Each page contains multiple entries. 
For each entry, extract:
- 'root': The base Arabic root (e.g., 'شجب').
- 'word': The specific word or verb being defined (e.g., 'شَجَبَ').
- 'definition': The definition text.
- 'entities': Any people, places, or tribes mentioned.

CRITICAL: Return ONLY a valid JSON object. Use the exact field names: 'root', 'word', 'definition', 'entities'. 
If a root is not explicitly mentioned but is the same as the previous entry, infer it.
"""

def get_embedding(text: str) -> Optional[List[float]]:
    payload = {"model": OLLAMA_EMBED_MODEL, "prompt": text}
    try:
        response = requests.post(f"{OLLAMA_URL}/api/embeddings", json=payload, timeout=60)
        if response.status_code != 200:
            print(f"  Embedding API Error ({response.status_code}): {response.text}")
            return None
        return response.json()["embedding"]
    except Exception as e:
        print(f"  Embedding Exception: {e}")
        return None

def query_ollama(text: str) -> Optional[PageExtraction]:
    prompt = f"Extract entries from this text:\n\n{text}"
    
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt}
        ],
        "format": "json",
        "stream": False
    }
    
    try:
        response = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=180)
        response.raise_for_status()
        data = response.json()
        content = data["message"]["content"]
        
        parsed_content = json.loads(content)
        
        if "entries" not in parsed_content and "dictionary_entries" in parsed_content:
            parsed_content = {"entries": parsed_content["dictionary_entries"]}
        elif "entries" not in parsed_content and isinstance(parsed_content, list):
            parsed_content = {"entries": parsed_content}
        
        if "entries" in parsed_content:
            for entry in parsed_content["entries"]:
                if "entities" in entry and isinstance(entry["entities"], list):
                    fixed_entities = []
                    for ent in entry["entities"]:
                        if isinstance(ent, str):
                            fixed_entities.append({"name": ent, "type": "Person"})
                        elif isinstance(ent, dict) and "name" in ent:
                            fixed_entities.append(ent)
                    entry["entities"] = fixed_entities

        return PageExtraction.model_validate(parsed_content)
    except Exception as e:
        print(f"Error querying/validating Ollama: {e}")
        return None

def save_to_surreal(extraction: PageExtraction, page_id: str, source_id: str):
    def to_rid(rec_str):
        if isinstance(rec_str, RecordID): return rec_str
        if ":" not in str(rec_str): return rec_str
        parts = str(rec_str).split(":", 1)
        return RecordID(parts[0], parts[1].replace("`", ""))

    page_rid = to_rid(page_id)
    source_rid = to_rid(source_id)

    # Allowed entity types in schema
    ALLOWED_ENTITY_TYPES = ['Divine', 'Celestial', 'Prophetic', 'Person', 'Group', 'Place', 'Scripture', 'Afterlife', 'Object', 'Event', 'Concept']

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        for idx, entry in enumerate(extraction.entries):
            try:
                entry.root = entry.root.strip()
                entry.word = entry.word.strip()
                if not entry.root or not entry.word: continue

                # 1. Upsert Root
                root_rid = RecordID("root", entry.root)
                db.query("UPSERT $id SET arabic_root = $root, identifier = $root", {"id": root_rid, "root": entry.root})
                
                # 2. Upsert Word
                word_rid = RecordID("word", entry.word)
                db.query("""
                    UPSERT $id SET 
                        text = $word, 
                        simple_text = $word,
                        root = $root_id
                """, {"id": word_rid, "word": entry.word, "root_id": root_rid})
                
                # 3. Create Definition Sentence
                embedding = get_embedding(entry.definition)
                if not embedding: continue
                
                sentence_uid = re.sub(r'[^\w]', '', entry.word)[:20] + "_" + str(hash(entry.definition) % 10000)
                sentence_rid = RecordID("sentence", f"dictionary_{sentence_uid}")
                
                db.query("""
                    UPSERT $id SET 
                        text = $text,
                        parent = $page_id,
                        source = $source_id,
                        chunk_index = $chunk_index,
                        embedding = $embedding,
                        transliterations = {
                            en: "",
                            ru: "",
                            tr: ""
                        };
                    
                    RELATE $id->defines->$word_id;
                """, {
                    "id": sentence_rid, 
                    "text": entry.definition, 
                    "page_id": page_rid, 
                    "source_id": source_rid,
                    "word_id": word_rid,
                    "chunk_index": idx,
                    "embedding": embedding
                })
                print(f"    Saved: {entry.word} (Root: {entry.root})")
                
                # 4. Handle Entities
                for ent in entry.entities:
                    if not ent.name.strip(): continue
                    
                    # Map types to allowed schema types
                    ent_type = ent.type
                    if ent_type == "Tribe": ent_type = "Group"
                    if ent_type not in ALLOWED_ENTITY_TYPES: ent_type = "Concept"
                    
                    safe_name = re.sub(r'[^\w]', '_', ent.name)
                    ent_rid = RecordID("entity", safe_name)
                    db.query("UPSERT $id SET name = $name, type = $type, language = 'ar'", {"id": ent_rid, "name": ent.name, "type": ent_type})
                    db.query("RELATE $sent_id->mentions->$ent_id", {
                        "sent_id": sentence_rid, 
                        "ent_id": ent_rid
                    })
            except Exception as e:
                print(f"  Error saving entry {entry.word}: {e}")

def run_prototype():
    source_id = "source:`shamela_القاموس_المحيط__الفيروزآبادي__ط_الرسالة__ط8_غيرملو_محمد_بن_يعقوب_الفيروز_آبادي_مج`"
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        print("Fetching sample pages (101-102)...")
        res = db.query(f"SELECT id, content FROM book_page WHERE source = {source_id} LIMIT 2 START 100")
        
        if isinstance(res, list) and len(res) > 0 and isinstance(res[0], list):
            pages = res[0]
        else:
            pages = res
            
        if not pages:
            print("No pages found for the specified source and range.")
            return

        print(f"Starting extraction for {len(pages)} pages...")
        for page in pages:
            if not isinstance(page, dict): continue
            page_id = page["id"]
            print(f"Processing Page: {page_id}")
            
            extraction = query_ollama(page["content"])
            if extraction:
                print(f"  Extracted {len(extraction.entries)} entries.")
                save_to_surreal(extraction, page_id, source_id)
            else:
                print(f"  Failed to extract from page {page_id}")

if __name__ == "__main__":
    run_prototype()
