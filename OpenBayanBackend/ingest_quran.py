import requests
import json
import time
from typing import List
from pydantic import BaseModel
from surrealdb import Surreal
import sys

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

class ChunkResult(BaseModel):
    arabic_chunk: str
    transliteration: TransliterationChunk
    categories: List[Categorization]
    entities: List[Entity]

class AyahEnrichmentResult(BaseModel):
    chunks: List[ChunkResult]

def get_taxonomy_labels():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        res = db.query("SELECT label FROM category WHERE level >= 2;")
        return [r["label"] for r in res]

TAXONOMY_LABELS = get_taxonomy_labels()

def get_embedding(text):
    for attempt in range(3):
        try:
            res = requests.post(f"{OLLAMA_URL}/api/embeddings", json={"model": MODEL_EMBED, "prompt": text}, timeout=30)
            return res.json()["embedding"]
        except Exception as e:
            time.sleep(2)
    return None

def enrich_and_chunk_ayah(arabic_text, clean_text, trans_en, trans_ru, trans_tr, context):
    labels_str = "\n".join(TAXONOMY_LABELS)
    prompt = f"""
Context: {context}

Ayah (Uthmani): {arabic_text}
Ayah (Clean): {clean_text}
Transliteration (EN): {trans_en}
Transliteration (RU): {trans_ru}
Transliteration (TR): {trans_tr}

Task:
1. Split the Ayah into logical semantic chunks (sentences) based on Quranic waqf marks if present.
2. Align the English, Russian, and Turkish transliterations perfectly with each Arabic chunk.
3. For each chunk, map to relevant categories from this list:
{labels_str}
4. Extract entities for each chunk.

Return JSON in this format:
{{
  "chunks": [
    {{
      "arabic_chunk": "...",
      "transliteration": {{ "en": "...", "ru": "...", "tr": "..." }},
      "categories": [{{ "label": "...", "importance": 10, "reasoning": "..." }}],
      "entities": [{{ "name": "...", "type": "..." }}]
    }}
  ]
}}
"""
    for attempt in range(3):
        try:
            res = requests.post(f"{OLLAMA_URL}/api/generate", json={"model": MODEL_ENRICH, "prompt": prompt, "stream": False, "format": "json"}, timeout=120)
            return AyahEnrichmentResult.model_validate_json(res.json()["response"])
        except Exception as e:
            print(f"  (!) Enrichment/Chunking failed on attempt {attempt+1}. Error: {e}")
            time.sleep(2)
    return None

def get_hizb_context(hizb_quarter):
    try:
        res = requests.get(f"https://api.alquran.cloud/v1/hizbQuarter/{hizb_quarter}/quran-simple-clean").json()
        return " ".join([a["text"] for a in res["data"]["ayahs"]])
    except:
        return ""

def ingest_surah(surah_number, db):
    print(f"\n--- Starting ingestion for Surah {surah_number} ---")
    
    # Fetch Ayahs and Transliterations
    print(f"Fetching Ayahs for Surah {surah_number} from API...")
    try:
        res_u = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/quran-uthmani").json()["data"]["ayahs"]
        res_c = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/quran-simple-clean").json()["data"]["ayahs"]
        res_en = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/en.transliteration").json()["data"]["ayahs"]
        res_ru = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/ru.transliteration").json()["data"]["ayahs"]
        res_tr = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/tr.transliteration").json()["data"]["ayahs"]
    except Exception as e:
        print(f"Failed to fetch data for Surah {surah_number}: {e}")
        return

    total = len(res_u)
    print(f"Processing {total} Ayahs...")

    hizb_cache = {}

    for i in range(total):
        ayah_u = res_u[i]
        ref = ayah_u["numberInSurah"]
        
        ayah_c = res_c[i]
        ayah_en = res_en[i]
        ayah_ru = res_ru[i]
        ayah_tr = res_tr[i]
        hizb = ayah_u["hizbQuarter"]
        
        print(f"[{ref}/{total}] Processing Ayah {surah_number}:{ref} (Hizb {hizb})...")
        
        if hizb not in hizb_cache:
            hizb_cache[hizb] = get_hizb_context(hizb)
        context = hizb_cache[hizb]
        
        enrichment = enrich_and_chunk_ayah(
            ayah_u["text"], ayah_c["text"], 
            ayah_en["text"], ayah_ru["text"], ayah_tr["text"], 
            context
        )
        
        if not enrichment:
            print(f"Skipping {surah_number}:{ref} due to LLM failure.")
            continue

        for idx, chunk in enumerate(enrichment.chunks):
            sid = f"sentence:quran_{surah_number}_{ref}_chunk_{idx}"
            
            vec_text = get_embedding(chunk.arabic_chunk)
            vec_sound = get_embedding(chunk.transliteration.en)
            
            if not vec_text or not vec_sound:
                continue

            db.query(f"DELETE {sid};")
            db.query(
                f"CREATE {sid} SET text = $text, transliteration_en = $en, transliteration_ru = $ru, transliteration_tr = $tr, chunk_index = $idx, source_type = 'quran', surah_number = $sn, ayah_number = $an, hizb_quarter = $hq, embedding = $vec, embedding_transliteration = $vec_s, llm_context = $ctx",
                {
                    "text": chunk.arabic_chunk,
                    "en": chunk.transliteration.en,
                    "ru": chunk.transliteration.ru,
                    "tr": chunk.transliteration.tr,
                    "idx": idx,
                    "sn": surah_number,
                    "an": ref,
                    "hq": hizb,
                    "vec": vec_text,
                    "vec_s": vec_sound,
                    "ctx": context
                }
            )
            
            for cat in chunk.categories:
                tag_res = db.query("SELECT id FROM category WHERE label = $label LIMIT 1", {"label": cat.label})
                if tag_res:
                    tid = tag_res[0]["id"]
                    final_weight = cat.importance
                    if surah_number == 2 and ref == 255: 
                        final_weight = min(10, final_weight + 2)
                    elif surah_number == 1:
                        final_weight = min(10, final_weight + 1)
                    
                    db.query(f"RELATE {sid}->tagged_with->{tid} SET weight = $w, reasoning = $r", {"w": final_weight, "r": cat.reasoning})
            
            for ent in chunk.entities:
                safe_ent_name = ent.name.replace(" ", "_").replace("'", "").lower()
                safe_ent_name = "".join([c for c in safe_ent_name if c.isalnum() or c == "_"])
                if not safe_ent_name: continue
                eid = f"entity:`{safe_ent_name}`"
                db.query(f"UPSERT {eid} SET name = $n, type = $t", {"n": ent.name, "t": ent.type})
                db.query(f"RELATE {sid}->mentions->{eid}")

def main():
    print("Starting Full Quran Ingestion Pipeline...")
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        
        # Start from Surah 1 to 114
        for surah_number in range(1, 115):
            ingest_surah(surah_number, db)

    print("✅ Entire Quran ingestion complete!")

if __name__ == "__main__":
    main()