import os
from surrealdb import Surreal, RecordID
from dotenv import load_dotenv

load_dotenv()
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

def check():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        source_id = RecordID("source", "shamela_ميزان_الإعتدال_فى_نقد_الرجال__الذهبي__ت_البجاوي__ط_الذهبي")
        
        res = db.query("SELECT count() FROM book_page WHERE source = $src GROUP ALL", {"src": source_id})
        print(f"Total pages: {res}")
        
        res2 = db.query("SELECT count() FROM book_page WHERE source = $src AND processed_for_rijal = false GROUP ALL", {"src": source_id})
        print(f"Unprocessed pages: {res2}")

if __name__ == "__main__":
    check()
