import requests
import json
import time
from typing import List, Optional
from pydantic import BaseModel
from surrealdb import Surreal
from prefect import flow, task, get_run_logger

# Configuration
SURREAL_URL = "ws://surrealdb:8000/rpc"
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

class Relation(BaseModel):
    subject: str
    predicate: str
    object: str

class ChunkResult(BaseModel):
    arabic_chunk: str
    transliteration: TransliterationChunk
    categories: List[Categorization]
    entities: List[Entity]
    relations: List[Relation]

class AyahEnrichmentResult(BaseModel):
    chunks: List[ChunkResult]

@task(retries=3, retry_delay_seconds=2)
def get_taxonomy_labels():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "RwAbXjBc2z36z"})
        db.use("openbayan", "openbayan")
        res = db.query("SELECT label FROM category WHERE level >= 2;")
        return [r["label"] for r in res]

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
Assign categories (1-10), extract entities, and capture narrative relationships for EACH chunk.
Narrative Relationships: e.g. (Prophet Musa) -> [confronts] -> (Firaun).
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
      "entities": [{{ "name": "string", "type": "string" }}],
      "relations": [{{ "subject": "string", "predicate": "string", "object": "string" }}]
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
        db.signin({"user": "root", "pass": "RwAbXjBc2z36z"})
        db.use("openbayan", "openbayan")
        
        db.query(f"DELETE {sid};")
        db.query(f"CREATE {sid} CONTENT $record", {"record": record})
        
        for cat in categories:
            tag_res = db.query("SELECT id FROM category WHERE label = $label LIMIT 1", {"label": cat.label})
            if tag_res:
                tid = tag_res[0]["id"]
                weight = cat.importance
                if surah_number == 2 and ayah_number == 255: weight = min(10, weight + 2)
                elif surah_number == 1: weight = min(10, weight + 1)
                db.query(f"RELATE {sid}->tagged_with->{tid} SET weight = $w, reasoning = $r", {"w": weight, "r": cat.reasoning})
        
        for ent in entities:
            safe_ent_name = "".join([c for c in ent.name.replace(" ", "_").replace("'", "").lower() if c.isalnum() or c == "_"])
            if not safe_ent_name: continue
            eid = f"entity:`{safe_ent_name}`"
            db.query(f"UPSERT {eid} SET name = $n, type = $t", {"n": ent.name, "t": ent.type})
            db.query(f"RELATE {sid}->mentions->{eid}")

        for rel in record.get("narrative_relations", []):
            s_slug = "".join([c for c in rel["subject"].replace(" ", "_").replace("'", "").lower() if c.isalnum() or c == "_"])
            o_slug = "".join([c for c in rel["object"].replace(" ", "_").replace("'", "").lower() if c.isalnum() or c == "_"])
            if not s_slug or not o_slug: continue
            
            sid_ent = f"entity:`{s_slug}`"
            oid_ent = f"entity:`{o_slug}`"
            
            # Ensure entities exist before relating them
            db.query(f"UPSERT {sid_ent} SET name = $n", {"n": rel["subject"]})
            db.query(f"UPSERT {oid_ent} SET name = $n", {"n": rel["object"]})
            
            # Create interaction edge
            db.query(f"RELATE {sid_ent}->interacts_with->{oid_ent} SET action = $p, source = $source", {
                "p": rel["predicate"],
                "source": sid
            })

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
                    
                    vec_text = get_embedding(chunk.arabic_chunk)
                    vec_sound = get_embedding(chunk.transliteration.en)
                    
                    record = {
                        "text": chunk.arabic_chunk,
                        "transliteration_en": chunk.transliteration.en,
                        "transliteration_ru": chunk.transliteration.ru,
                        "transliteration_tr": chunk.transliteration.tr,
                        "chunk_index": idx,
                        "source_type": "quran",
                        "surah_number": surah_number,
                        "ayah_number": ref,
                        "hizb_quarter": hizb,
                        "embedding": vec_text,
                        "embedding_transliteration": vec_sound,
                        "llm_context": hizb_cache[hizb],
                        "narrative_relations": [r.model_dump() for r in chunk.relations]
                    }
                    
                    save_to_surreal(sid, record, chunk.categories, chunk.entities, surah_number, ref)
            except Exception as e:
                logger.error(f"Failed Ayah {surah_number}:{ref}: {e}")

if __name__ == "__main__":
    quran_ingestion_flow()