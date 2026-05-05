import os
from surrealdb import Surreal
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

def run_verification():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)

        print("=== 📊 Dictionary Knowledge Graph Statistics ===")
        
        def get_count(table):
            try:
                r = db.query(f"SELECT count() FROM {table} GROUP ALL")
                # In 2.0.0, r seems to be a list of results directly
                # [{'count': 42}]
                if isinstance(r, list) and len(r) > 0:
                    item = r[0]
                    if isinstance(item, list) and len(item) > 0:
                        return item[0].get('count', 0)
                    elif isinstance(item, dict):
                        return item.get('count', 0)
                return 0
            except:
                return 0

        roots = get_count("root")
        words = get_count("word")
        sentences = get_count("sentence")
        defines = get_count("defines")
        entities = get_count("entity")
        
        print(f"Roots:      {roots}")
        print(f"Words:      {words}")
        print(f"Sentences:  {sentences}")
        print(f"Definitions:{defines}")
        print(f"Entities:   {entities}")

        print("\n=== 🔍 Sample Data Trace (Top 3 Words) ===")
        q = """
            SELECT 
                text AS definition,
                ->defines->word.text AS word,
                ->defines->word.root.arabic_root AS root,
                parent AS source_page
            FROM sentence 
            WHERE source = source:`shamela_القاموس_المحيط__الفيروزآبادي__ط_الرسالة__ط8_غيرملو_محمد_بن_يعقوب_الفيروز_آبادي_مج`
            LIMIT 3
        """
        res_trace = db.query(q)
        if isinstance(res_trace, list) and len(res_trace) > 0:
            # res_trace[0] should be our list of results
            records = res_trace[0] if isinstance(res_trace[0], list) else res_trace
            for record in records:
                if not isinstance(record, dict): continue
                word_list = record.get('word', [])
                root_list = record.get('root', [])
                word = word_list[0] if word_list else "N/A"
                root = root_list[0] if root_list else "N/A"
                print(f"Word: {word}")
                print(f"  Root:       {root}")
                print(f"  Definition: {record.get('definition', '')[:100]}...")
                print(f"  Source:     {record.get('source_page')}")
                print("-" * 30)

if __name__ == "__main__":
    run_verification()
