import requests
import json
import re
import time
from typing import List, Optional
from pydantic import BaseModel
from surrealdb import Surreal

# Configuration
SURREAL_URL = "ws://surrealdb:8000/rpc"
OLLAMA_URL = "http://100.121.116.17:11434"
MODEL_ENRICH = "qwen2.5:7b"
MODEL_EMBED = "mxbai-embed-large:latest"
SURAH_NUMBER = 2  # Al-Baqarah

class Categorization(BaseModel):
    label: str
    importance: int # 1-10
    reasoning: str

class Entity(BaseModel):
    name: str
    type: str

class EnrichmentResult(BaseModel):
    categories: List[Categorization]
    entities: List[Entity]

def get_taxonomy_labels():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        res = db.query("SELECT label FROM category WHERE level >= 2;")
        return [r["label"] for r in res]

TAXONOMY_LABELS = get_taxonomy_labels()

def get_embedding(text):
    res = requests.post(f"{OLLAMA_URL}/api/embeddings", json={"model": MODEL_EMBED, "prompt": text})
    return res.json()["embedding"]

def enrich_ayah(text, context):
    labels_str = "\n".join(TAXONOMY_LABELS)
    prompt = f"Context: {context}\n\nAnalyze this Ayah: {text}\n" \
             f"Map to ALL relevant categories from this list (provide at least one, multiple if applicable):\n{labels_str}\n\n" \
             f"For each category, assign an 'importance' score (1-10) based on how foundational this verse is to that theme, and a brief 'reasoning'.\n" \
             f"Return JSON: {{'categories': [{{'label': '...', 'importance': 10, 'reasoning': '...'}}], 'entities': [{{'name': '...', 'type': '...'}}]}}"
    
    res = requests.post(f"{OLLAMA_URL}/api/generate", json={"model": MODEL_ENRICH, "prompt": prompt, "stream": False, "format": "json"})
    try:
        return EnrichmentResult.model_validate_json(res.json()["response"])
    except Exception as e:
        print(f"  (!) Enrichment failed for text: {text[:50]}... Error: {e}")
        return None

def get_hizb_context(hizb_quarter):
    res = requests.get(f"https://api.alquran.cloud/v1/hizbQuarter/{hizb_quarter}/quran-simple-clean").json()
    return " ".join([a["text"] for a in res["data"]["ayahs"]])

def ingest_surah(limit=None):
    print(f"Starting ingestion for Surah {SURAH_NUMBER}...")
    
    # Fetch Ayahs
    print("Fetching Ayahs from API...")
    res_u = requests.get(f"https://api.alquran.cloud/v1/surah/{SURAH_NUMBER}/quran-uthmani").json()["data"]["ayahs"]
    res_c = requests.get(f"https://api.alquran.cloud/v1/surah/{SURAH_NUMBER}/quran-simple-clean").json()["data"]["ayahs"]
    
    total = len(res_u) if limit is None else min(limit, len(res_u))
    print(f"Processing {total} Ayahs...")

    hizb_cache = {}

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")

        for i in range(total):
            ayah_u = res_u[i]
            ayah_c = res_c[i]
            ref = ayah_u["numberInSurah"]
            hizb = ayah_u["hizbQuarter"]
            
            print(f"[{ref}/{total}] Processing Ayah {SURAH_NUMBER}:{ref} (Hizb {hizb})...")
            
            # Fetch Context if not cached
            if hizb not in hizb_cache:
                print(f"  -> Fetching Hizb {hizb} context...")
                hizb_cache[hizb] = get_hizb_context(hizb)
            
            context = hizb_cache[hizb]
            
            # 1. Embed Clean Text
            vector = get_embedding(ayah_c["text"])
            
            # 2. Enrich (AI Categorization) with Context
            enrichment = enrich_ayah(ayah_c["text"], context)
            
            # 3. Create Sentence Record
            sid = f"sentence:baqarah_{ref}"
            db.query(f"DELETE {sid};")
            db.query(
                f"CREATE {sid} SET text = $text, simple_clean_text = $clean, chunk_index = $idx, source_type = 'quran', surah_number = $sn, ayah_number = $an, hizb_quarter = $hq, embedding = $vec, llm_context = $ctx",
                {
                    "text": ayah_u["text"],
                    "clean": ayah_c["text"],
                    "idx": i,
                    "sn": SURAH_NUMBER,
                    "an": ref,
                    "hq": hizb,
                    "vec": vector,
                    "ctx": context
                }
            )
            
            # 4. Create Graph Relations if enrichment succeeded
            if enrichment:
                # Resolve Category IDs and create 'tagged_with' relations
                for cat in enrichment.categories:
                    tag_label = cat.label
                    
                    # Method B: Metadata Heuristics
                    final_weight = cat.importance
                    if SURAH_NUMBER == 2 and ref == 255: # Ayat al-Kursi boost
                        final_weight = min(10, final_weight + 2)
                    
                    tag_res = db.query("SELECT id FROM category WHERE label = $label LIMIT 1", {"label": tag_label})
                    if tag_res:
                        tid = tag_res[0]["id"]
                        db.query(
                            f"RELATE {sid}->tagged_with->{tid} SET weight = $w, reasoning = $r", 
                            {"w": final_weight, "r": cat.reasoning}
                        )
                        print(f"  -> Linked to Category: {tag_label} (Weight: {final_weight})")
                
                # Link Entities
                for ent in enrichment.entities:
                    # Sanitize and quote entity ID
                    safe_ent_name = ent.name.replace(" ", "_").replace("'", "").lower()
                    eid = f"entity:`{safe_ent_name}`"
                    db.query(f"UPSERT {eid} SET name = $n, type = $t", {"n": ent.name, "t": ent.type})
                    db.query(f"RELATE {sid}->mentions->{eid}")

    print(f"\n✅ Ingestion of {total} ayahs complete!")

if __name__ == "__main__":
    # Full ingestion for Surah Al-Baqarah
    ingest_surah(limit=None)
