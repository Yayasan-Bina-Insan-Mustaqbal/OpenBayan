import os
import time
import requests
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

OLLAMA_URL = "http://100.121.116.17:11434"
DB_URL = "http://192.168.100.33:8000/sql"
DB_HEADERS = {"Accept": "application/json", "NS": "openbayan", "DB": "openbayan"}

# Models to stress test
MODELS_TO_TEST = [
    "llama3.2:3b",     # Best new fast model
    "llama3:latest",   # Old reliable model
    "gemma2:9b",       # High quality medium model
    "qwen2.5-coder:7b" # Alternative highly capable new model
]

TARGET_DURATION_SECONDS = 10 * 60  # 10 minutes per model
CONCURRENCY = 16

def fetch_real_sentences(limit=5000):
    print("Fetching real Arabic sentences from SurrealDB...")
    query = f"SELECT text FROM sentence LIMIT {limit};"
    try:
        res = requests.post(DB_URL, headers=DB_HEADERS, data=query, timeout=30)
        res.raise_for_status()
        data = res.json()
        sentences = [item["text"] for item in data[0]["result"]]
        print(f"Fetched {len(sentences)} sentences.")
        return sentences
    except Exception as e:
        print(f"Failed to fetch sentences: {e}")
        # Fallback sentences
        return [
            "قال رسول الله صلى الله عليه وسلم: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى.",
            "الكلمة الطيبة صدقة.",
            "الطهور شطر الإيمان."
        ] * 1000

def translate_sentence(model: str, sentence: str):
    prompt = f"Translate the following Arabic Islamic text to English accurately. Provide ONLY the translation and nothing else:\n{sentence}"
    payload = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": 0.1,
            "num_predict": 100
        }
    }
    
    try:
        res = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=120)
        res.raise_for_status()
        data = res.json()
        return {
            "text": data.get("response", "").strip(),
            "eval_count": data.get("eval_count", 0),
            "eval_duration": data.get("eval_duration", 0) / 1e9,
            "success": True
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

def stress_test_model(model: str, sentences: list):
    print(f"\n{'='*50}\nSTARTING 10-MINUTE STRESS TEST: {model}\n{'='*50}", flush=True)
    
    # Warmup
    try:
        requests.post(f"{OLLAMA_URL}/api/generate", json={"model": model, "prompt": "Hi", "stream": False}, timeout=120)
    except Exception:
        print(f"Failed to load {model}, skipping.", flush=True)
        return
        
    start_time = time.time()
    total_tokens = 0
    successful_translations = 0
    failed_translations = 0
    
    # We will submit sentences to the executor in batches to avoid eating too much memory,
    # but since we want to run for exactly 10 minutes, we'll feed them continuously.
    
    executor = ThreadPoolExecutor(max_workers=CONCURRENCY)
    futures = set()
    
    sentence_idx = 0
    
    # Initial load
    for _ in range(min(CONCURRENCY * 2, len(sentences))):
        futures.add(executor.submit(translate_sentence, model, sentences[sentence_idx]))
        sentence_idx += 1
        
    while futures:
        # Check if we exceeded the target duration
        elapsed = time.time() - start_time
        if elapsed >= TARGET_DURATION_SECONDS:
            print(f"Reached {TARGET_DURATION_SECONDS} seconds. Stopping test for {model}.", flush=True)
            executor.shutdown(wait=False, cancel_futures=True)
            break
            
        # Wait for at least one future to complete
        completed_futures = set()
        for f in list(futures):
            if f.done():
                completed_futures.add(f)
                
        for f in completed_futures:
            futures.remove(f)
            res = f.result()
            if res["success"]:
                total_tokens += res["eval_count"]
                successful_translations += 1
            else:
                failed_translations += 1
                
            # Submit another task if we haven't run out of sentences and haven't exceeded time
            if sentence_idx < len(sentences) and (time.time() - start_time) < TARGET_DURATION_SECONDS:
                futures.add(executor.submit(translate_sentence, model, sentences[sentence_idx]))
                sentence_idx += 1
                
        # Small sleep to prevent CPU spinning if no futures are done yet
        time.sleep(0.1)
        
        # Print progress every minute
        if int(elapsed) % 60 == 0 and int(elapsed) > 0:
            current_speed = total_tokens / elapsed
            print(f"[{model}] {int(elapsed//60)} min elapsed | Sentences: {successful_translations} | Speed: {current_speed:.1f} t/s", flush=True)
            time.sleep(1) # Prevent multiple prints for the same second
            
    final_time = time.time() - start_time
    final_speed = total_tokens / final_time if final_time > 0 else 0
    
    print(f"\n--- STRESS TEST RESULTS FOR {model} ---", flush=True)
    print(f"Total Duration: {final_time:.2f} seconds", flush=True)
    print(f"Total Sentences Translated: {successful_translations}", flush=True)
    print(f"Total Tokens Generated: {total_tokens}", flush=True)
    print(f"Average Sustained Speed: {final_speed:.1f} tokens/second", flush=True)
    print(f"Failures/Timeouts: {failed_translations}", flush=True)
    
    return {
        "model": model,
        "speed": final_speed,
        "sentences": successful_translations,
        "failures": failed_translations
    }

if __name__ == "__main__":
    print("Starting Extensive Benchmark Script...", flush=True)
    sentences = fetch_real_sentences(limit=20000)
    
    results = []
    for m in MODELS_TO_TEST:
        res = stress_test_model(m, sentences)
        if res:
            results.append(res)
            
    print("\n\n" + "="*60, flush=True)
    print("FINAL EXTENSIVE BENCHMARK RESULTS", flush=True)
    print("="*60, flush=True)
    for r in results:
        print(f"Model: {r['model']:<20} | Sentences: {r['sentences']:<5} | Sustained Speed: {r['speed']:.1f} t/s | Failures: {r['failures']}", flush=True)
