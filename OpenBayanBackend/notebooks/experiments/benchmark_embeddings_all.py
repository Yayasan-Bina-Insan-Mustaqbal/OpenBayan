import os
import time
import requests
import json
from concurrent.futures import ThreadPoolExecutor

OLLAMA_URL = "http://100.121.116.17:11434"

sample_text = "قال رسول الله صلى الله عليه وسلم: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته إلى الله ورسوله فهجرته إلى الله ورسوله ومن كانت هجرته لدنيا يصيبها أو امرأة ينكحها فهجرته إلى ما هاجر إليه."
# We'll test with 50 sentences so it doesn't take hours
sentences = [sample_text for _ in range(50)]

def get_all_models():
    try:
        res = requests.get(f"{OLLAMA_URL}/api/tags")
        res.raise_for_status()
        data = res.json()
        return [m["name"] for m in data.get("models", [])]
    except Exception as e:
        print(f"Failed to fetch models: {e}")
        return []

def embed_batch(model: str, batch: list):
    start = time.time()
    try:
        res = requests.post(f"{OLLAMA_URL}/api/embed", json={"model": model, "input": batch}, timeout=60)
        res.raise_for_status()
        end = time.time()
        # Verify it actually returned embeddings
        data = res.json()
        if "embeddings" not in data or not data["embeddings"]:
            return 0, 0
        return len(batch), end - start
    except Exception as e:
        return 0, 0

def benchmark_model(model: str, batch_size: int = 8, max_workers: int = 2):
    print(f"--- Benchmarking Embedding Speed for {model} ---", flush=True)
    
    # Warmup and test if model supports embed
    try:
        res = requests.post(f"{OLLAMA_URL}/api/embed", json={"model": model, "input": ["warmup"]}, timeout=60)
        res.raise_for_status()
    except Exception as e:
        print(f"Failed to load or embed with {model}, skipping... Error: {e}", flush=True)
        return None
        
    batches = [sentences[i:i + batch_size] for i in range(0, len(sentences), batch_size)]
    
    start_total = time.time()
    total_chunks = 0
    
    # Parallel processing
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(lambda b: embed_batch(model, b), batches))
        
    for count, _ in results:
        total_chunks += count
        
    elapsed = time.time() - start_total
    speed = (total_chunks / elapsed) * 60 if elapsed > 0 else 0
    
    if total_chunks == 0:
        print(f"Model: {model} failed to embed the chunks.", flush=True)
        return None
        
    print(f"Model: {model}", flush=True)
    print(f"Total Sentences Embedded: {total_chunks}", flush=True)
    print(f"Total Time: {elapsed:.2f} s", flush=True)
    print(f"Speed: {speed:.1f} sentences / minute", flush=True)
    print("-" * 30 + "\n", flush=True)
    return {"model": model, "speed": speed, "time": elapsed}

if __name__ == "__main__":
    models = get_all_models()
    # Skip vision models, but we'll include all 27 generative LLMs and the 3 embedding models
    skip_keywords = ["llava", "minicpm", "ocr", "vl"]
    valid_models = [m for m in models if not any(k in m.lower() for k in skip_keywords)]
    
    print(f"Starting Embedding Benchmark on {len(valid_models)} models for 50 sentences each...", flush=True)
    
    results = []
    for m in valid_models:
        res = benchmark_model(m, batch_size=8, max_workers=2)
        if res:
            results.append(res)
            
    print("\n\n=== FINAL EMBEDDING RESULTS (ALL MODELS) ===", flush=True)
    results.sort(key=lambda x: x["speed"], reverse=True)
    
    with open("embedding_all_benchmark_results.md", "w") as f:
        f.write("# Massive Embedding Benchmark (All Models)\n\n")
        f.write("| Model | Speed (sentences/min) | Time for 50 sentences |\n")
        f.write("|---|---|---|\n")
        for r in results:
            print(f"{r['model']:<30} {r['speed']:.1f} sentences/min", flush=True)
            f.write(f"| `{r['model']}` | {r['speed']:.1f} | {r['time']:.2f}s |\n")
    print("Results saved to embedding_all_benchmark_results.md", flush=True)
