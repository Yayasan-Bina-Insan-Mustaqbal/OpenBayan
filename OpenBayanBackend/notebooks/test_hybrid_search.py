import requests
from surrealdb import Surreal

# Configuration
SURREAL_URL = "ws://surrealdb:8000/rpc"
OLLAMA_URL = "http://100.121.116.17:11434"
EMBED_MODEL = "mxbai-embed-large:latest"

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

def search(query_text, limit=3):
    print(f"Searching for: '{query_text}'")
    embedding = get_embedding(query_text)

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": "root", "pass": "root"})
        db.use("main", "main")

        # Vector search query - using similarity function
        results = db.query(
            """
            SELECT 
                text, 
                chunk_index,
                vector::similarity::cosine(embedding, $embedding) AS sim
            FROM sentence 
            ORDER BY sim DESC
            LIMIT $limit;
            """,
            {"embedding": embedding, "limit": limit}
        )
        # print(f"DEBUG: {results}")
        return results

def main():
    queries = [
        "الحي القيوم", # The Living, The Eternal
        "وسعه كرسيه",   # His Throne extends
        "لا يؤوده حفظهما" # Their preservation tires Him not
    ]

    for q in queries:
        results = search(q)
        print(f"\nResults for '{q}':")
        print(results)
        print("-" * 50)


if __name__ == "__main__":
    main()
