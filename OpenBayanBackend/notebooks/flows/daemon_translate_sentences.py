import os
import re
import json
import time
import requests
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
MODEL_NAME = "llama3.2:3b"

SURREAL_URL = os.getenv("SURREALDB_URL", "http://192.168.100.33:8000/sql")
SURREAL_AUTH = (os.getenv("SURREALDB_USERNAME", "root"), os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z"))
SURREAL_HEADERS = {
    "surreal-ns": os.getenv("SURREALDB_NAMESPACE", "openbayan"),
    "surreal-db": os.getenv("SURREALDB_DATABASE", "openbayan"),
    "Accept": "application/json",
    "Content-Type": "text/plain"
}

def execute_sql(sql: str, retries: int = 5, backoff: float = 2.0):
    for attempt in range(retries):
        try:
            res = requests.post(SURREAL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=sql.encode('utf-8'), timeout=60)
            if res.status_code != 200:
                raise Exception(f"SurrealDB Error: {res.text}")
            return res.json()
        except requests.exceptions.RequestException as e:
            if attempt == retries - 1:
                raise e
            time.sleep(backoff * (2 ** attempt))

def translate_text(text: str) -> str:
    prompt = f"Translate the following Arabic Islamic text to English accurately. Provide ONLY the translation and nothing else:\n{text}"
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 150
        }
    }
    try:
        res = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=60)
        res.raise_for_status()
        data = res.json()
        translation = data.get("response", "").strip()
        # Clean up any potential markdown or prefixes
        translation = re.sub(r'^["\']|["\']$', '', translation)
        translation = translation.replace("Translation:", "").replace("translation:", "").strip()
        return translation
    except Exception as e:
        print(f"Translation error: {e}")
        return ""

def process_batch(records: list):
    translations = []
    
    with ThreadPoolExecutor(max_workers=20) as executor:
        future_to_record = {executor.submit(translate_text, r["text"]): r for r in records}
        for future in as_completed(future_to_record):
            record = future_to_record[future]
            try:
                translated_text = future.result()
                if translated_text and len(translated_text) > 3:
                    translations.append((record["id"], translated_text))
            except Exception as e:
                pass
                
    if not translations:
        return 0
        
    # Bulk update to SurrealDB
    queries = ["BEGIN TRANSACTION;"]
    for rid, trans in translations:
        # Use MERGE to safely add metadata.translations.en without destroying existing metadata
        safe_trans = trans.replace("'", "\\'")
        q = f"UPDATE {rid} MERGE {{ metadata: {{ translations: {{ en: '{safe_trans}' }} }}, is_translated_en: true }};"
        queries.append(q)
    queries.append("COMMIT TRANSACTION;")
    
    try:
        execute_sql("\n".join(queries))
        return len(translations)
    except Exception as e:
        print(f"DB update error: {e}")
        return 0

def daemon_loop(source_type: str = None, batch_size: int = 100):
    print(f"Bismillah. Starting Sentence Translation Daemon (Model: {MODEL_NAME}, Source: {source_type or 'ALL'})...", flush=True)
    
    total_translated = 0
    start_time = time.time()
    
    while True:
        # Query sentences that lack English translations
        where_clause = "is_translated_en = false"
        if source_type:
            # We can filter by source if needed. Wait, source is a record pointer like source:hadith_...
            # We can use CONTAINS or string matching on the id
            where_clause += f" AND string::startsWith(id, 'sentence:⟨{source_type}')"
            
        query = f"SELECT id, text FROM sentence WHERE {where_clause} LIMIT {batch_size};"
        
        try:
            res = execute_sql(query)
            records = res[0].get("result", [])
            
            if not records:
                print("No untranslated sentences found. Sleeping for 60s...", flush=True)
                time.sleep(60)
                continue
                
            success_count = process_batch(records)
            total_translated += success_count
            
            elapsed = time.time() - start_time
            speed = (total_translated / elapsed) * 60 if elapsed > 0 else 0
            
            print(f"Translated {success_count}/{len(records)} | Total: {total_translated} | Speed: {speed:.1f} sentences/min", flush=True)
            
            if success_count == 0:
                print("Failed to translate batch. Sleeping briefly to avoid hammering the API...", flush=True)
                time.sleep(5)
                
        except Exception as e:
            print(f"Daemon Error: {e}", flush=True)
            time.sleep(10)

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=str, default=None, help="Filter by source type prefix (e.g. 'hadith', 'tafsir', 'kitab')")
    parser.add_argument("--batch", type=int, default=100)
    args = parser.parse_args()
    
    daemon_loop(source_type=args.source, batch_size=args.batch)
