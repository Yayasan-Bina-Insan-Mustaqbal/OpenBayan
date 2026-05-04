import requests
import json
import time
import re
from typing import List, Optional
from pydantic import BaseModel
from surrealdb import Surreal
from prefect import flow, task, get_run_logger

# Configuration
SURREAL_URL = "ws://192.168.100.33:8000/rpc"
SURREAL_USER = "root"
SURREAL_PASS = "RwAbXjBc2z36z"
OLLAMA_URL = "http://100.121.116.17:11434"
MODEL_ENRICH = "qwen2.5:7b"
MODEL_EMBED = "mxbai-embed-large:latest"

class Categorization(BaseModel):
    label: str
    importance: int # 1-10
    reasoning: str

class Entity(BaseModel):
    name: str
    type: str

class TransliterationChunk(BaseModel):
    en: str
    ru: str
    tr: str

class ChunkResult(BaseModel):
    arabic_chunk: str
    transliteration: TransliterationChunk
    categories: List[Categorization]
    entities: List[Entity]

class AyahEnrichmentResult(BaseModel):
    chunks: List[ChunkResult]

@task(retries=3, retry_delay_seconds=2)
def get_taxonomy_labels():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use("openbayan", "openbayan")
        res = db.query("SELECT label FROM category WHERE level >= 2;")
        return [r["label"] for r in res]

@task
def strip_tashkeel(text: str) -> str:
    # Standard Quranic/Arabic tashkeel characters
    tashkeel_pattern = re.compile(r'[\u0617-\u061A\u064B-\u0652\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]')
    return tashkeel_pattern.sub('', text)

@task(retries=5, retry_delay_seconds=5)
def get_embedding(text: str):
    res = requests.post(f"{OLLAMA_URL}/api/embeddings", json={"model": MODEL_EMBED, "prompt": text}, timeout=60)
    res.raise_for_status()
    return res.json()["embedding"]

@task(retries=3, retry_delay_seconds=10)
def enrich_and_chunk_ayah(arabic_text, trans_en, trans_ru, trans_tr, context, labels):
    logger = get_run_logger()
    labels_str = ", ".join(labels)
    prompt = f"""
### CONTEXT
{context}

### TASK
Split this Ayah into semantic sentences based on Quranic waqf marks.
Assign categories (1-10) and extract entities for EACH chunk.
Categories to choose from: {labels_str}

Arabic: {arabic_text}
EN Trans: {trans_en}
RU Trans: {trans_ru}
TR Trans: {trans_tr}

Return ONLY this JSON schema:
{{
  "chunks": [
    {{
      "arabic_chunk": "string",
      "transliteration": {{ "en": "string", "ru": "string", "tr": "string" }},
      "categories": [{{ "label": "string", "importance": 10, "reasoning": "string" }}],
      "entities": [{{ "name": "string", "type": "string" }}]
    }}
  ]
}}
"""
    res = requests.post(f"{OLLAMA_URL}/api/generate", json={
        "model": MODEL_ENRICH, 
        "prompt": prompt, 
        "stream": False, 
        "format": "json",
        "options": {"temperature": 0.1}
    }, timeout=180)
    res.raise_for_status()
    return AyahEnrichmentResult.model_validate_json(res.json()["response"])

@task
def get_hizb_context(hizb_quarter):
    res = requests.get(f"https://api.alquran.cloud/v1/hizbQuarter/{hizb_quarter}/quran-simple-clean").json()
    return " ".join([a["text"] for a in res["data"]["ayahs"]])

@task
def save_to_surreal(sid, record, categories, entities, surah_number, ayah_number):
    logger = get_run_logger()
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use("openbayan", "openbayan")
        
        try:
            params = {}
            # Clean up the record for SCHEMAFULL sentence table
            # These are temporary fields used to pass context to this function
            record["parent"] = ayah_id
            record["source"] = source_id
            record.pop("hizb_quarter", None)
            record.pop("juz", None)
            record.pop("page", None)
            record.pop("uthmani_text", None)
            record.pop("source_type", None)

            # Wrap all node and edge creation in a TRANSACTION
            query = "BEGIN TRANSACTION;"
            
            # 1. First ensure the Source (Edition) exists
            source_id = f"source:quran_uthmani"
            query += f" UPSERT {source_id} SET identifier = 'quran_uthmani', type = 'quran', language = 'ar', url = 'https://api.alquran.cloud';"
            
            # 2. Ensure the Ayah (Parent) exists and has coordinates
            ayah_id = f"ayah:quran_{surah_number}_{ayah_number}"
            query += f" UPSERT {ayah_id} SET surah_number = $surah, ayah_number = $ayah, juz = $juz, hizb_quarter = $hizb, uthmani_text = $uthmani;"
            
            # 3. Save the sentence chunk linking to parent and source
            query += f" UPSERT {sid} CONTENT $record;"
            
            # 4. Process Categories (Edges)
            for cat in categories:
                tag_res = db.query("SELECT id FROM category WHERE label = $label LIMIT 1", {"label": cat.label})
                if tag_res and len(tag_res[0]["result"]) > 0:
                    tid = tag_res[0]["result"][0]["id"]
                    weight = cat.importance
                    if surah_number == 2 and ayah_number == 255: weight = min(10, weight + 2)
                    elif surah_number == 1: weight = min(10, weight + 1)
                    
                    # Ensure tid is safe for parameter names
                    tid_safe = str(tid).replace(":", "_").replace("(", "").replace(")", "")
                    query += f" RELATE {sid}->tagged_with->{tid} SET weight = $weight_{tid_safe}, reasoning = $reason_{tid_safe};"
                    params[f"weight_{tid_safe}"] = weight
                    params[f"reason_{tid_safe}"] = cat.reasoning

            # 5. Process Entities (Edges)
            for ent in entities:
                safe_ent_name = "".join([c for c in ent.name.replace(" ", "_").replace("'", "").lower() if c.isalnum() or c == "_"])
                if safe_ent_name:
                    eid = f"entity:`{safe_ent_name}`"
                    query += f" UPSERT {eid} SET name = $name_{safe_ent_name}, type = $type_{safe_ent_name};"
                    query += f" RELATE {sid}->mentions->{eid};"
                    params[f"name_{safe_ent_name}"] = ent.name
                    params[f"type_{safe_ent_name}"] = ent.type

            query += " COMMIT TRANSACTION;"
            
            # Execute the batch
            params.update({
                "surah": surah_number,
                "ayah": ayah_number,
                "juz": record.get("juz"),
                "hizb": record.get("hizb_quarter"),
                "uthmani": record.get("uthmani_text", ""),
                "record": record
            })
            
            db.query(query, params)
            logger.info(f"  -> [TX] Saved chunk {sid} with all graph relations.")
            
        except Exception as e:
            logger.error(f"  (!) Transaction Failed for {sid}: {e}")
            db.query("CANCEL TRANSACTION;")
            raise e



@flow(name="Quran Multi-Modal Ingestion")
def quran_ingestion_flow(start_surah: int = 1, end_surah: int = 114):
    logger = get_run_logger()
    labels = get_taxonomy_labels()
    
    for surah_number in range(start_surah, end_surah + 1):
        logger.info(f"--- Processing Surah {surah_number} ---")
        
        res_u = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/quran-uthmani").json()["data"]["ayahs"]
        res_en = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/en.transliteration").json()["data"]["ayahs"]
        res_ru = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/ru.transliteration").json()["data"]["ayahs"]
        res_tr = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/tr.transliteration").json()["data"]["ayahs"]
        
        hizb_cache = {}

        for i in range(len(res_u)):
            ayah_u = res_u[i]
            ref = ayah_u["numberInSurah"]
            hizb = ayah_u["hizbQuarter"]
            
            if hizb not in hizb_cache:
                hizb_cache[hizb] = get_hizb_context(hizb)
            
            try:
                enrichment = enrich_and_chunk_ayah(
                    ayah_u["text"], res_en[i]["text"], res_ru[i]["text"], res_tr[i]["text"],
                    hizb_cache[hizb], labels
                )
                
                for idx, chunk in enumerate(enrichment.chunks):
                    sid = f"sentence:quran_{surah_number}_{ref}_chunk_{idx}"
                    
                    # Generate Clean Arabic for vector search stability
                    clean_text = strip_tashkeel(chunk.arabic_chunk)
                    
                    vec_text = get_embedding(clean_text) # Vector from CLEAN Arabic
                    vec_sound = get_embedding(chunk.transliteration.en)
                    
                    record = {
                        "text": chunk.arabic_chunk,
                        "simple_clean_text": clean_text,
                        "transliterations": {
                            "en": chunk.transliteration.en,
                            "ru": chunk.transliteration.ru,
                            "tr": chunk.transliteration.tr
                        },
                        "chunk_index": idx,
                        "embedding": vec_text,
                        "embedding_transliteration": vec_sound,
                        "uthmani_text": ayah_u["text"], # Pass this so it can be saved to parent
                        "hizb_quarter": hizb, # Needed for the save_to_surreal helper to pass to parent
                    }
                    
                    save_to_surreal(sid, record, chunk.categories, chunk.entities, surah_number, ref)
            except Exception as e:
                logger.error(f"Failed Ayah {surah_number}:{ref}: {e}")

if __name__ == "__main__":
    quran_ingestion_flow()