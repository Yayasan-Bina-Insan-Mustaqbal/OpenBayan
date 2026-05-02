import requests
import re
import time
from surrealdb import Surreal

# Configuration
SURREAL_URL = "ws://surrealdb:8000/rpc"
OLLAMA_URL = "http://100.121.116.17:11434"
EMBED_MODEL = "mxbai-embed-large:latest"

def chunk_text(text):
    waqf_marks = r'[\u06d6-\u06db]'
    chunks = re.split(waqf_marks, text)
    return [c.strip() for c in chunks if c.strip()]

def get_embedding(text):
    start = time.time()
    response = requests.post(f"{OLLAMA_URL}/api/embeddings", json={"model": EMBED_MODEL, "prompt": text})
    response.raise_for_status()
    duration = time.time() - start
    return response.json()["embedding"], duration

def main():
    print("--- STEP 1: Ingestion & Timing ---")
    # Fetch both versions
    res_u = requests.get("https://api.alquran.cloud/v1/ayah/2:255/quran-uthmani").json()["data"]
    res_c = requests.get("https://api.alquran.cloud/v1/ayah/2:255/quran-simple-clean").json()["data"]
    
    chunks_u = chunk_text(res_u["text"])
    chunks_c = chunk_text(res_c["text"])
    
    print(f"Chunks: {len(chunks_u)}")
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")
        db.query("DELETE sentence")

        time_u, time_c = 0, 0

        for i in range(len(chunks_u)):
            emb_u, d_u = get_embedding(chunks_u[i])
            emb_c, d_c = get_embedding(chunks_c[i])
            time_u += d_u
            time_c += d_c
            
            db.query("CREATE sentence CONTENT $rec", {
                "rec": {
                    "text": chunks_u[i],
                    "simple_clean_text": chunks_c[i],
                    "chunk_index": i,
                    "source_type": "quran",
                    "ayah_number": 255,
                    "surah_number": 2,
                    "embedding": emb_u,
                    "embedding_clean": emb_c,
                    "llm_context": res_u["text"],
                    "source_url": "https://api.alquran.cloud/v1/ayah/2:255/quran-uthmani"
                }
            })

    print(f"Avg Time (Uthmani): {time_u/len(chunks_u):.4f}s")
    print(f"Avg Time (Clean):   {time_c/len(chunks_u):.4f}s")

    print("\n--- STEP 2: Search Comparison ---")
    queries = ["The Living, The Eternal", "Heaven and Earth", "He is the Most Great"]
    
    for q in queries:
        print(f"\nQuery: '{q}'")
        q_emb, _ = get_embedding(q)
        
        with Surreal(SURREAL_URL) as db:
            db.signin({"user": "root", "pass": "root"})
            db.use("main", "main")
            
            # Search Uthmani
            res_u = db.query("SELECT text, vector::similarity::cosine(embedding, $q) AS sim FROM sentence ORDER BY sim DESC LIMIT 1", {"q": q_emb})
            # Search Clean
            res_c = db.query("SELECT text, vector::similarity::cosine(embedding_clean, $q) AS sim FROM sentence ORDER BY sim DESC LIMIT 1", {"q": q_emb})
            
            if res_u:
                print(f"  [Uthmani] Score: {res_u[0]['sim']:.4f} | {res_u[0]['text']}")
            if res_c:
                print(f"  [Clean  ] Score: {res_c[0]['sim']:.4f} | {res_c[0]['text']}")

if __name__ == "__main__":
    main()
