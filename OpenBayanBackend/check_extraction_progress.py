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

def check_progress():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        src_id = RecordID("source", "shamela_ميزان_الإعتدال_فى_نقد_الرجال__الذهبي__ت_البجاوي__ط_الذهبي")
        
        # Helper to get count from result
        def get_count(res):
            try:
                # Handle list of results (one per query in the batch)
                if isinstance(res, list) and len(res) > 0:
                    data = res[0]
                    # Handle single object vs list of objects
                    if isinstance(data, list) and len(data) > 0:
                        return data[0].get('count', 0)
                    elif isinstance(data, dict):
                        return data.get('count', 0)
                return 0
            except:
                return 0

        res_pages = db.query("SELECT count() FROM book_page WHERE source = $src AND processed_for_rijal = true GROUP ALL", {"src": src_id})
        processed_count = get_count(res_pages)
        
        res_total = db.query("SELECT count() FROM book_page WHERE source = $src GROUP ALL", {"src": src_id})
        total_count = get_count(res_total)
        
        res_narrators = db.query("SELECT count() FROM entity WHERE type = 'Person' AND biographical_notes != NONE GROUP ALL")
        narrator_count = get_count(res_narrators)
        
        res_rel = db.query("SELECT count() FROM narrated_to GROUP ALL")
        rel_count = get_count(res_rel)

        print(f"--- Ilm al-Rijal Progress Report ---")
        print(f"Processed Pages: {processed_count} / {total_count}")
        if total_count > 0:
            print(f"Completion: {processed_count/total_count*100:.2f}%")
        print(f"Narrators Extracted: {narrator_count}")
        print(f"Network Relationships: {rel_count}")

if __name__ == "__main__":
    check_progress()
