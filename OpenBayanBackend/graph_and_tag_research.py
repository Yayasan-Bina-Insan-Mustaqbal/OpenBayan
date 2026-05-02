import requests
import re
from surrealdb import Surreal

# Configuration
SURREAL_URL = "ws://surrealdb:8000/rpc"
OLLAMA_URL = "http://100.121.116.17:11434"
EMBED_MODEL = "mxbai-embed-large:latest"

def get_embedding(text):
    response = requests.post(f"{OLLAMA_URL}/api/embeddings", json={"model": EMBED_MODEL, "prompt": text})
    response.raise_for_status()
    return response.json()["embedding"]

def chunk_text(text):
    waqf_marks = r'[\u06d6-\u06db]'
    chunks = re.split(waqf_marks, text)
    return [c.strip() for c in chunks if c.strip()]

def setup_graph_and_tag():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        
        # 1. Setup Hierarchical Alamah
        print("Setting up Taxonomy...")
        db.query("DELETE alamah; DELETE tagged_with; DELETE sub_topic;")
        
        # Root: Theology
        res_theo = db.query("CREATE alamah:theology SET label = 'Theology', category = 'subject';")
        # Child: Attributes of Allah
        res_attr = db.query("CREATE alamah:attributes SET label = 'Attributes of Allah', category = 'subject', parent = alamah:theology;")
        # Child: Sovereignty
        res_sov = db.query("CREATE alamah:sovereignty SET label = 'Sovereignty', category = 'subject', parent = alamah:theology;")
        
        # Create sub_topic relationships (Edges)
        db.query("RELATE alamah:attributes->sub_topic->alamah:theology;")
        db.query("RELATE alamah:sovereignty->sub_topic->alamah:theology;")

        # 2. Ingest Quranic Text
        print("Ingesting Quranic segments...")
        db.query("DELETE sentence")
        
        res_u = requests.get("https://api.alquran.cloud/v1/ayah/2:255/quran-uthmani").json()["data"]
        res_c = requests.get("https://api.alquran.cloud/v1/ayah/2:255/quran-simple-clean").json()["data"]
        
        chunks_u = chunk_text(res_u["text"])
        chunks_c = chunk_text(res_c["text"])
        
        sentence_ids = []
        for i in range(len(chunks_u)):
            emb = get_embedding(chunks_c[i])
            res = db.query("CREATE sentence CONTENT $rec", {
                "rec": {
                    "text": chunks_u[i],
                    "simple_clean_text": chunks_c[i],
                    "chunk_index": i,
                    "source_type": "quran",
                    "embedding": emb,
                    "llm_context": res_c["text"]
                }
            })
            sentence_ids.append(res[0]["id"])

        # 3. Tag segments (Manual for this research)
        print("Relating segments to Taxonomy (Graph Edges)...")
        # Chunk 0: "Allah... Ever-Living" -> Attributes
        db.query(f"RELATE {sentence_ids[0]}->tagged_with->alamah:attributes SET weight = 1.0;")
        # Chunk 6: "His Throne extends..." -> Sovereignty
        db.query(f"RELATE {sentence_ids[6]}->tagged_with->alamah:sovereignty SET weight = 1.0;")
        
        print("✅ Graph setup and tagging complete.")

def search_with_graph_filter(query_text, tag_id=None):
    print(f"\n--- Search Query: '{query_text}' ---")
    if tag_id:
        print(f"Filter: Only include results tagged with '{tag_id}'")
        
    embedding = get_embedding(query_text)
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        
        if tag_id:
            # Query with Graph Filter: 
            # Find sentences where ->tagged_with->alamah.id = $tag
            sql = """
                SELECT 
                    text, 
                    vector::similarity::cosine(embedding, $embedding) AS sim,
                    ->tagged_with->alamah.label AS tags
                FROM sentence 
                WHERE ->tagged_with->alamah CONTAINS $tag
                ORDER BY sim DESC;
            """
            results = db.query(sql, {"embedding": embedding, "tag": tag_id})
        else:
            # Normal semantic search
            sql = """
                SELECT 
                    text, 
                    vector::similarity::cosine(embedding, $embedding) AS sim,
                    ->tagged_with->alamah.label AS tags
                FROM sentence 
                ORDER BY sim DESC 
                LIMIT 3;
            """
            results = db.query(sql, {"embedding": embedding})
            
        return results

def main():
    setup_graph_and_tag()
    
    # Test 1: Broad Semantic Search
    res1 = search_with_graph_filter("Kingdom and power")
    for r in res1:
        print(f"[Score: {r['sim']:.4f}] Tags: {r['tags']} | {r['text']}")

    # Test 2: Filtered Search (Sovereignty)
    # This should only return the 'Throne' chunk
    res2 = search_with_graph_filter("Attributes of Allah", tag_id="alamah:sovereignty")
    for r in res2:
        print(f"[Score: {r['sim']:.4f}] Tags: {r['tags']} | {r['text']}")

    # Test 3: Filtered Search (Attributes)
    # This should only return the 'Living/Sustainer' chunk
    res3 = search_with_graph_filter("Attributes of Allah", tag_id="alamah:attributes")
    for r in res3:
        print(f"[Score: {r['sim']:.4f}] Tags: {r['tags']} | {r['text']}")

if __name__ == "__main__":
    main()
