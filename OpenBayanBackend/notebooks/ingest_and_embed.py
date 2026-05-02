import os
import requests
import re
from surrealdb import Surreal

# Configuration
SURREAL_URL = "ws://surrealdb:8000/rpc"
OLLAMA_URL = "http://100.121.116.17:11434"
EMBED_MODEL = "mxbai-embed-large:latest"

def chunk_quranic_text(text):
    # Quranic stop marks for chunking
    # ۚ (jeem), ۖ (sala), ۗ (qala), ۘ (meem), ۙ (la), ۛ (three dots)
    waqf_marks = r'[\u06d6-\u06db]'
    chunks = re.split(waqf_marks, text)
    return [c.strip() for c in chunks if c.strip()]

def get_embedding(text):
    response = requests.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={
            "model": EMBED_MODEL,
            "prompt": text
        }
    )
    response.raise_for_status()
    return response.json()["embedding"]

def main():
    print("Fetching Ayat al-Kursi...")
    # Surah 2, Ayah 255
    res = requests.get("https://api.alquran.cloud/v1/ayah/2:255/quran-uthmani")
    data = res.json()["data"]
    text = data["text"]
    
    print("Chunking text...")
    chunks = chunk_quranic_text(text)
    print(f"Total chunks: {len(chunks)}")

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")

        for i, chunk in enumerate(chunks):
            print(f"Processing chunk {i+1}/{len(chunks)}...")
            embedding = get_embedding(chunk)
            
            record = {
                "text": chunk,
                "chunk_index": i,
                "source_type": "quran",
                "ayah_number": 255,
                "surah_number": 2,
                "surah_name": "Al-Baqara",
                "embedding": embedding,
                "llm_context": text,
                "source_url": "https://api.alquran.cloud/v1/ayah/2:255/quran-uthmani"
            }
            
            # Use upsert logic
            db.query(
                "CREATE sentence CONTENT $record",
                {"record": record}
            )

    print("Ingestion and embedding complete!")

if __name__ == "__main__":
    main()
