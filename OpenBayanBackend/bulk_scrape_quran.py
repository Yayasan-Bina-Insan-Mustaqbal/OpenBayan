import requests
import json
import time
from typing import List, Dict, Any
from surrealdb import Surreal
from prefect import flow, task, get_run_logger

# Configuration
SURREAL_URL = "ws://surrealdb:8000/rpc"

# Editions to scrape
EDITIONS = [
    "quran-uthmani",
    "quran-simple-clean",
    "en.sahih",
    "ru.kuliev",
    "tr.diyanet",
    "ar.muyassar",
    "ar.jalalayn",
    "en.transliteration",
    "ru.transliteration",
    "tr.transliteration"
]

# Map identifiers to schema fields
IDENTIFIER_MAP = {
    "quran-uthmani": ("text_uthmani", None),
    "quran-simple-clean": ("text_simple", None),
    "en.sahih": ("translations", "en_sahih"),
    "ru.kuliev": ("translations", "ru_kuliev"),
    "tr.diyanet": ("translations", "tr_diyanet"),
    "ar.muyassar": ("tafsir", "ar_muyassar"),
    "ar.jalalayn": ("tafsir", "ar_jalalayn"),
    "en.transliteration": ("transliterations", "en"),
    "ru.transliteration": ("transliterations", "ru"),
    "tr.transliteration": ("transliterations", "tr")
}

@task(retries=5, retry_delay_seconds=10)
def fetch_surah_data(surah_number: int) -> List[Dict[str, Any]]:
    logger = get_run_logger()
    logger.info(f"Fetching Surah {surah_number} for editions: {', '.join(EDITIONS)}")
    
    editions_str = ",".join(EDITIONS)
    url = f"https://api.alquran.cloud/v1/surah/{surah_number}/editions/{editions_str}"
    
    res = requests.get(url)
    res.raise_for_status()
    data = res.json()["data"]
    
    # data is a list of editions, each having 'ayahs'
    # We want to pivot this to a list of ayahs with all editions
    
    num_ayahs = len(data[0]["ayahs"])
    ayahs_collection = []
    
    for i in range(num_ayahs):
        # Base metadata from the first edition (uthmani)
        base_ayah = data[0]["ayahs"][i]
        merged_ayah = {
            "surah_number": surah_number,
            "ayah_number": base_ayah["numberInSurah"],
            "juz": base_ayah["juz"],
            "hizb_quarter": base_ayah["hizbQuarter"],
            "page": base_ayah["page"],
            "translations": {},
            "tafsir": {},
            "transliterations": {}
        }
        
        # Merge all editions
        for edition_idx, edition_data in enumerate(data):
            identifier = EDITIONS[edition_idx]
            ayah_text = edition_data["ayahs"][i]["text"]
            
            field, subfield = IDENTIFIER_MAP[identifier]
            if subfield:
                merged_ayah[field][subfield] = ayah_text
            else:
                merged_ayah[field] = ayah_text
                
        ayahs_collection.append(merged_ayah)
        
    return ayahs_collection

@task
def save_ayahs_to_db(ayahs: List[Dict[str, Any]]):
    logger = get_run_logger()
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        
        for ayah in ayahs:
            sid = f"ayah:quran_{ayah['surah_number']}_{ayah['ayah_number']}"
            try:
                db.upsert(sid, ayah)
            except Exception as e:
                logger.error(f"Failed to save {sid}: {e}")

@flow(name="Bulk Scrape Quran Raw Data")
def bulk_scrape_quran_flow(start_surah: int = 1, end_surah: int = 114):
    logger = get_run_logger()
    logger.info(f"Starting bulk scrape from Surah {start_surah} to {end_surah}")
    
    for surah_num in range(start_surah, end_surah + 1):
        try:
            ayahs = fetch_surah_data(surah_num)
            save_ayahs_to_db(ayahs)
            logger.info(f"Successfully scraped and saved Surah {surah_num} ({len(ayahs)} ayahs)")
            # Respect the API's rate limits/load
            time.sleep(0.5)
        except Exception as e:
            logger.error(f"Failed Surah {surah_num}: {e}")

if __name__ == "__main__":
    bulk_scrape_quran_flow()
