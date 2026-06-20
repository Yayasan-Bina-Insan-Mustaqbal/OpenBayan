import os
import time
import requests
import json
from concurrent.futures import ThreadPoolExecutor

OLLAMA_URL = "http://100.121.116.17:11434"
MODELS = ["mxbai-embed-large:latest", "nomic-embed-text:latest", "bge-m3:latest"]

sample_text = "قال رسول الله صلى الله عليه وسلم: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته إلى الله ورسوله فهجرته إلى الله ورسوله ومن كانت هجرته لدنيا يصيبها أو امرأة ينكحها فهجرته إلى ما هاجر إليه."
# Let's test with 500 sentences
sentences = [sample_text for _ in range(500)]

def embed_batch(model: str, batch: list):
    start = time.time()
    try:
        res = requests.post(f"{OLLAMA_URL}/api/embed", json={"model": model, "input": batch}, timeout=120)
        res.raise_for_status()
        end = time.time()
        return len(batch), end - start
    except Exception as e:
        print(f"Error for {model}: {e}")
        return 0, 0

def benchmark_model(model: str, batch_size: int = 32, max_workers: int = 4):
    print(f"--- Benchmarking {model} ---")
    
    # Try to load the model first to avoid cold start penalties
    try:
        requests.post(f"{OLLAMA_URL}/api/embed", json={"model": model, "input": ["warmup"]}, timeout=120)
    except Exception:
        print(f"Failed to load {model}, skipping...")
        return
        
    batches = [sentences[i:i + batch_size] for i in range(0, len(sentences), batch_size)]
    
    start_total = time.time()
    total_chunks = 0
    
    # Parallel processing: sending multiple batches concurrently
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(lambda b: embed_batch(model, b), batches))
        
    for count, _ in results:
        total_chunks += count
        
    elapsed = time.time() - start_total
    speed = (total_chunks / elapsed) * 60 if elapsed > 0 else 0
    print(f"Model: {model}")
    print(f"Total Sentences Embedded: {total_chunks}")
    print(f"Total Time: {elapsed:.2f} s")
    print(f"Speed: {speed:.1f} sentences / minute")
    print("-" * 30 + "\n")

if __name__ == "__main__":
    print(f"Starting Benchmark for {len(sentences)} sentences...")
    print("Using Parallel Processing: 4 concurrent batch workers, 32 sentences per batch.\n")
    for m in MODELS:
        benchmark_model(m, batch_size=32, max_workers=4)
