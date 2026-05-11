import os
import json
from surrealdb import Surreal, RecordID
from dotenv import load_dotenv

load_dotenv()
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

def check_overall_progress():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        def get_data(res):
            if isinstance(res, list) and len(res) > 0:
                # SurrealDB Python client returns list of results
                # Each result is a list of records or a single record
                if isinstance(res[0], list):
                    return res[0]
                return res
            return []

        def get_count(res):
            data = get_data(res)
            if isinstance(data, list) and len(data) > 0:
                if isinstance(data[0], dict):
                    return data[0].get('count', 0)
            elif isinstance(data, dict):
                return data.get('count', 0)
            return 0

        print(f"--- [ Overall Knowledge Graph Progress ] ---")
        
        # 1. Hadith Ingestion
        res_hadith = db.query("SELECT count(), collection FROM hadith GROUP BY collection")
        hadith_list = get_data(res_hadith)
        total_hadith = 0
        print("\n[ Hadith Ingestion ]")
        if isinstance(hadith_list, list):
            for item in hadith_list:
                if isinstance(item, dict):
                    print(f" - {item.get('collection', 'unknown')}: {item.get('count', 0)}")
                    total_hadith += item.get('count', 0)
        print(f"Total Hadiths: {total_hadith}")

        # 2. Dictionary Root Extraction (KG)
        res_kg_processed = db.query("SELECT count() FROM book_page WHERE processed_for_kg = true GROUP ALL")
        res_kg_total = db.query("SELECT count() FROM book_page WHERE source.identifier CONTAINS 'shamela' AND processed_for_kg != NONE GROUP ALL")
        kg_p = get_count(res_kg_processed)
        kg_t = get_count(res_kg_total)
        print(f"\n[ Dictionary Root Extraction ]")
        print(f"Processed: {kg_p} / {kg_t}")
        if kg_t > 0:
            print(f"Completion: {kg_p/kg_t*100:.2f}%")
        
        # 3. Ilm al-Rijal (Narrator network)
        src_rijal = RecordID("source", "shamela_ميزان_الإعتدال_فى_نقد_الرجال__الذهبي__ت_البجاوي__ط_الذهبي")
        res_rijal_p = db.query("SELECT count() FROM book_page WHERE source = $src AND processed_for_rijal = true GROUP ALL", {"src": src_rijal})
        res_rijal_t = db.query("SELECT count() FROM book_page WHERE source = $src GROUP ALL", {"src": src_rijal})
        rijal_p = get_count(res_rijal_p)
        rijal_t = get_count(res_rijal_t)
        print(f"\n[ Ilm al-Rijal Extraction ]")
        print(f"Processed: {rijal_p} / {rijal_t}")
        if rijal_t > 0:
            print(f"Completion: {rijal_p/rijal_t*100:.2f}%")
            
        # 4. Kitab Ingestion
        res_kitabs = db.query("SELECT count(), source.title as title FROM book_page WHERE source.identifier CONTAINS 'shamela' GROUP BY source.title")
        kitab_list = get_data(res_kitabs)
        print("\n[ Major Kitab Ingestion ]")
        if isinstance(kitab_list, list):
            for k in kitab_list:
                if isinstance(k, dict) and k.get('count', 0) > 100: # Filter out minor ones
                    print(f" - {k.get('title', 'unknown')}: {k.get('count', 0)} pages")

        # 5. Entity Stats
        res_narrators = db.query("SELECT count() FROM entity WHERE type = 'Person' AND biographical_notes != NONE GROUP ALL")
        res_roots = db.query("SELECT count() FROM entity WHERE type = 'Concept' GROUP ALL")
        print(f"\n[ Graph Statistics ]")
        print(f"Narrators: {get_count(res_narrators)}")
        print(f"Concepts/Roots: {get_count(res_roots)}")
        
        res_rel = db.query("SELECT count() FROM narrated_to GROUP ALL")
        print(f"Network Relations (Teacher/Student): {get_count(res_rel)}")

if __name__ == "__main__":
    check_overall_progress()
