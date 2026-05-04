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
    res = requests.post(f"{OLLAMA_URL}/api/embeddings", json={"model": MODEL_EMBED, "prompt": text})
    return res.json()["embedding"]

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
   **CRITICAL RULE:** All chunks MUST be verbatim, exact subsets of the original text. Do NOT rephrase or omit words.
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
    res = requests.post(f"{OLLAMA_URL}/api/generate", json={"model": MODEL_ENRICH, "prompt": prompt, "stream": False, "format": "json"})
    try:
        return AyahEnrichmentResult.model_validate_json(res.json()["response"])
    except Exception as e:
        print(f"  (!) Enrichment/Chunking failed. Error: {e}")
        return None

def get_hizb_context(hizb_quarter):
    res = requests.get(f"https://api.alquran.cloud/v1/hizbQuarter/{hizb_quarter}/quran-simple-clean").json()
    return " ".join([a["text"] for a in res["data"]["ayahs"]])

def ingest_surah(limit=None):
    print(f"Starting targeted ingestion for Surah {SURAH_NUMBER}...")
    
    # Fetch Ayahs and Transliterations
    print("Fetching Ayahs and Transliterations from API...")
    res_u = requests.get(f"https://api.alquran.cloud/v1/surah/{SURAH_NUMBER}/quran-uthmani").json()["data"]["ayahs"]
    res_c = requests.get(f"https://api.alquran.cloud/v1/surah/{SURAH_NUMBER}/quran-simple-clean").json()["data"]["ayahs"]
    res_en = requests.get(f"https://api.alquran.cloud/v1/surah/{SURAH_NUMBER}/en.transliteration").json()["data"]["ayahs"]
    res_ru = requests.get(f"https://api.alquran.cloud/v1/surah/{SURAH_NUMBER}/ru.transliteration").json()["data"]["ayahs"]
    res_tr = requests.get(f"https://api.alquran.cloud/v1/surah/{SURAH_NUMBER}/tr.transliteration").json()["data"]["ayahs"]
    
    total = len(res_u) if limit is None else min(limit, len(res_u))
    hizb_cache = {}

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")

        for i in range(total):
            ayah_u = res_u[i]
            ref = ayah_u["numberInSurah"]
            
            # TEST ONLY AYAT AL-KURSI (2:255)
            if ref != 255:
                continue
            
            ayah_c = res_c[i]
            ayah_en = res_en[i]
            ayah_ru = res_ru[i]
            ayah_tr = res_tr[i]
            hizb = ayah_u["hizbQuarter"]
            
            print(f"[{ref}/{total}] Processing Ayat al-Kursi (Hizb {hizb})...")
            
            if hizb not in hizb_cache:
                hizb_cache[hizb] = get_hizb_context(hizb)
            context = hizb_cache[hizb]
            
            # 1. Enrich, Align, and Chunk
            enrichment = enrich_and_chunk_ayah(
                ayah_u["text"], ayah_c["text"], 
                ayah_en["text"], ayah_ru["text"], ayah_tr["text"], 
                context
            )
            
            if not enrichment:
                continue

            # 2. Process each chunk
            for idx, chunk in enumerate(enrichment.chunks):
                sid = f"sentence:baqarah_255_chunk_{idx}"
                print(f"  -> Saving Chunk {idx}: {chunk.arabic_chunk[:30]}...")
                
                # Dual Vectorization
                vec_text = get_embedding(chunk.arabic_chunk)
                vec_sound = get_embedding(chunk.transliteration.en) # English transliteration for sound search
                
                db.query(f"DELETE {sid};")
                db.query(
                    f"CREATE {sid} SET text = $text, transliteration_en = $en, transliteration_ru = $ru, transliteration_tr = $tr, chunk_index = $idx, source_type = 'quran', surah_number = $sn, ayah_number = $an, hizb_quarter = $hq, embedding = $vec, embedding_transliteration = $vec_s, llm_context = $ctx",
                    {
                        "text": chunk.arabic_chunk,
                        "en": chunk.transliteration.en,
                        "ru": chunk.transliteration.ru,
                        "tr": chunk.transliteration.tr,
                        "idx": idx,
                        "sn": SURAH_NUMBER,
                        "an": ref,
                        "hq": hizb,
                        "vec": vec_text,
                        "vec_s": vec_sound,
                        "ctx": context
                    }
                )
                
                # Relations
                for cat in chunk.categories:
                    tag_res = db.query("SELECT id FROM category WHERE label = $label LIMIT 1", {"label": cat.label})
                    if tag_res:
                        tid = tag_res[0]["id"]
                        final_weight = min(10, cat.importance + 2) # Heuristic boost for Ayat al-Kursi
                        db.query(f"RELATE {sid}->tagged_with->{tid} SET weight = $w, reasoning = $r", {"w": final_weight, "r": cat.reasoning})
                
                for ent in chunk.entities:
                    safe_ent_name = ent.name.replace(" ", "_").replace("'", "").lower()
                    eid = f"entity:`{safe_ent_name}`"
                    db.query(f"UPSERT {eid} SET name = $n, type = $t", {"n": ent.name, "t": ent.type})
                    db.query(f"RELATE {sid}->mentions->{eid}")

    print(f"\n✅ Targeted ingestion complete!")

    print(f"\n✅ Ingestion of {total} ayahs complete!")

if __name__ == "__main__":
    # Full ingestion for Surah Al-Baqarah
    ingest_surah(limit=None)
