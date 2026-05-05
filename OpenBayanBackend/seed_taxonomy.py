import json
import os
from surrealdb import Surreal
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SURREAL_URL = os.getenv("SURREALDB_URL", "ws://localhost:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "root")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "OpenBayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "OpenBayan")

def seed_taxonomy():
    taxonomy_file = "OpenBayanBackend/notebooks/reference/taxonomy/main.json"
    if not os.path.exists(taxonomy_file):
        # Try relative to script
        taxonomy_file = "notebooks/reference/taxonomy/main.json"

    with open(taxonomy_file, "r") as f:
        data = json.load(f)

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        print(f"Connected to {SURREAL_URL} (NS: {SURREAL_NS}, DB: {SURREAL_DB})")
        print("Clearing old tables...")
        try:
            db.query("DELETE category; DELETE sub_topic;")
        except:
            pass

        def process_node(node, parent_id=None, level=1):
            name = node.get("name_en") or node.get("name_ar")
            safe_id = name.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_").lower()
            safe_id = "".join([c for c in safe_id if c.isalnum() or c == "_"])
            record_id = f"category:{safe_id}"
            
            print(f"Creating: {name} (Level {level})")
            
            # Use dynamic query parts to handle optional parent
            query = "CREATE type::record($id) SET label = $label, label_ar = $ar, level = $level"
            params = {
                "id": record_id,
                "label": name,
                "ar": node.get("name_ar"),
                "level": level
            }
            
            if parent_id:
                query += ", parent = type::record($parent)"
                params["parent"] = parent_id
            
            db.query(query, params)

            if parent_id:
                db.query(f"RELATE {record_id}->sub_topic->{parent_id}")

            children = node.get("chapters") or node.get("detailed_taxonomy") or node.get("sections") or node.get("abwaab") or []
            for child in children:
                process_node(child, record_id, level + 1)
        for top_level in data["taxonomy"]:
            process_node(top_level)

    print("✅ Taxonomy seeding complete.")

if __name__ == "__main__":
    seed_taxonomy()
