import json
from surrealdb import Surreal

SURREAL_URL = "ws://surrealdb:8000/rpc"

def seed_taxonomy():
    with open("/app/notebooks/reference/taxonomy/main.json", "r") as f:
        data = json.load(f)

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        
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
