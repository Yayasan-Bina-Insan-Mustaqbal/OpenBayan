import json
import os
from surrealdb import Surreal, RecordID
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

def seed_taxonomy():
    # Path to the taxonomy file on the server (relative to notebooks root)
    taxonomy_file = "/app/notebooks/reference/taxonomy/main.json"
    
    # Since we are running this script potentially outside the container too, 
    # we handle the path fallback.
    if not os.path.exists(taxonomy_file):
        taxonomy_file = "reference/taxonomy/main.json"

    print(f"Loading taxonomy from: {taxonomy_file}")
    with open(taxonomy_file, "r") as f:
        data = json.load(f)

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        print(f"Connected to {SURREAL_NS}:{SURREAL_DB} at {SURREAL_URL}")
        print("Clearing old categories...")
        try:
            db.query("DELETE category; DELETE tagged_with;")
        except Exception as e:
            print(f"Warning during cleanup: {e}")

        def process_node(node, parent_id=None, level=1):
            name = node.get("name_en") or node.get("name_ar")
            if not name:
                return
                
            # Create a safe ID
            safe_id = name.replace(" ", "_").replace("(", "").replace(")", "").replace("/", "_").lower()
            safe_id = "".join([c for c in safe_id if c.isalnum() or c == "_"])
            record_id = f"category:{safe_id}"
            
            print(f"Creating: {name} (Level {level})")
            
            # Prepare record
            record = {
                "label": name,
                "label_ar": node.get("name_ar"),
                "level": level
            }
            
            if parent_id:
                record["parent"] = RecordID(parent_id)
            
            # Upsert category
            db.query(f"UPSERT {record_id} CONTENT $record", {"record": record})

            # Create hierarchical relation
            if parent_id:
                db.query(f"RELATE {record_id}->sub_topic->{parent_id}")

            # Recurse into children
            children_keys = ["chapters", "detailed_taxonomy", "sections", "abwaab"]
            children = []
            for key in children_keys:
                if key in node and node[key]:
                    children = node[key]
                    break
            
            for child in children:
                process_node(child, record_id, level + 1)

        for top_level in data["taxonomy"]:
            process_node(top_level)

    print("\n✅ Taxonomy seeding complete.")

if __name__ == "__main__":
    seed_taxonomy()
