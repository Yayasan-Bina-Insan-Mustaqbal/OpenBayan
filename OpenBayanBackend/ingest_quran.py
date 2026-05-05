import requests
import json
import time
import re
from typing import List, Optional
from pydantic import BaseModel
from surrealdb import Surreal
from prefect import flow, task, get_run_logger

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000")
if not SURREAL_URL.endswith("/rpc"):
    SURREAL_URL = f"{SURREAL_URL.replace('http', 'ws')}/rpc"

SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "OpenBayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "OpenBayan")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
MODEL_EMBED = os.getenv("OLLAMA_EMBED_MODEL", "mxbai-embed-large:latest")

@task
def strip_tashkeel(text: str) -> str:
    """Strips all Arabic diacritics (tashkeel) from the given text."""
    if not text:
        return ""
    tashkeel_pattern = re.compile(r'[\u064B-\u0652\u0640\u0617-\u061A\u06D6-\u06ED]')
    return tashkeel_pattern.sub('', text)

@task(retries=5, retry_delay_seconds=5)
def get_embedding(text: str):
    res = requests.post(f"{OLLAMA_URL}/api/embeddings", json={"model": MODEL_EMBED, "prompt": text}, timeout=60)
    res.raise_for_status()
    return res.json()["embedding"]

@task
def save_ayah_to_surreal(surah_number, ayah_number, uthmani_text, clean_text, transliterations, translations, juz, hizb):
    logger = get_run_logger()
    ayah_id = f"ayah:quran_{surah_number}_{ayah_number}"
    
    # Get embedding for the clean text
    embedding = get_embedding(clean_text)
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        data = {
            "surah_number": surah_number,
            "ayah_number": ayah_number,
            "uthmani_text": uthmani_text,
            "simple_clean_text": clean_text,
            "transliterations": transliterations,
            "translations": translations,
            "juz": juz,
            "hizb_quarter": hizb,
            "embedding_summary": embedding
        }
        
        try:
            query = """
            UPSERT type::record($id) SET
                surah_number = $surah,
                ayah_number = $ayah,
                uthmani_text = $uthmani,
                simple_clean_text = $clean,
                transliterations = $translit,
                translations = $trans,
                juz = $juz,
                hizb_quarter = $hizb,
                embedding_summary = $embed;
            """
            params = {
                "id": ayah_id,
                "surah": surah_number,
                "ayah": ayah_number,
                "uthmani": uthmani_text,
                "clean": clean_text,
                "translit": transliterations,
                "trans": translations,
                "juz": juz,
                "hizb": hizb,
                "embed": embedding
            }
            db.query(query, params)
            logger.info(f"  -> Saved Ayah {surah_number}:{ayah_number}")
        except Exception as e:
            logger.error(f"  (!) Failed to save Ayah {ayah_id}: {e}")
            raise e

@flow(name="Quran Comprehensive Ingestion")
def quran_ingestion_flow(start_surah: int = 1, end_surah: int = 114):
    logger = get_run_logger()
    
    for surah_number in range(start_surah, end_surah + 1):
        logger.info(f"--- Processing Surah {surah_number} (Comprehensive) ---")
        
        # Arabic
        res_u = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/quran-uthmani").json()["data"]["ayahs"]
        
        # Transliterations
        res_tr_en = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/en.transliteration").json()["data"]["ayahs"]
        res_tr_ru = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/ru.transliteration").json()["data"]["ayahs"]
        res_tr_tr = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/tr.transliteration").json()["data"]["ayahs"]
        
        # Translations
        res_en = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/en.sahih").json()["data"]["ayahs"]
        res_ru = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/ru.kuliev").json()["data"]["ayahs"]
        res_tr = requests.get(f"https://api.alquran.cloud/v1/surah/{surah_number}/tr.diyanet").json()["data"]["ayahs"]
        
        for i in range(len(res_u)):
            ayah_u = res_u[i]
            ayah_num = ayah_u["numberInSurah"]
            
            clean_text = strip_tashkeel(ayah_u["text"])
            
            transliterations = {
                "en": res_tr_en[i]["text"],
                "ru": res_tr_ru[i]["text"],
                "tr": res_tr_tr[i]["text"]
            }
            
            translations = {
                "en": res_en[i]["text"],
                "ru": res_ru[i]["text"],
                "tr": res_tr[i]["text"]
            }
            
            save_ayah_to_surreal(
                surah_number, 
                ayah_num, 
                ayah_u["text"], 
                clean_text, 
                transliterations,
                translations,
                ayah_u["juz"], 
                ayah_u["hizbQuarter"]
            )

if __name__ == "__main__":
    # Ingest the whole Quran
    quran_ingestion_flow()
