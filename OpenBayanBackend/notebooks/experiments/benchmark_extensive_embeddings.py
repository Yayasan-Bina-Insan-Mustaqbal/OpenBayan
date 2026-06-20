import os
import time
import requests
from concurrent.futures import ThreadPoolExecutor

OLLAMA_URL = "http://100.121.116.17:11434"

MODELS_TO_TEST = [
    "mxbai-embed-large:latest",
    "nomic-embed-text:latest",
    "bge-m3:latest"
]

# We will use a massive array of 50,000 sentences to stress test the embedding models
sample_text = "قال رسول الله صلى الله عليه وسلم: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى فمن كانت هجرته إلى الله ورسوله فهجرته إلى الله ورسوله ومن كانت هجرته لدنيا يصيبها أو امرأة ينكحها فهجرته إلى ما هاجر إليه."
sentences = [sample_text for _ in range(50000)]

def embed_batch(model: str, batch: list):
    start = time.time()
    try:
        res = requests.post(f"{OLLAMA_URL}/api/embed", json={"model": model, "input": batch}, timeout=120)
        res.raise_for_status()
        return len(batch)
    except Exception as e:
        return 0

def benchmark_model(model: str, batch_size: int = 32, max_workers: int = 4):
    print(f"\n{'='*50}\nSTARTING EXTENSIVE STRESS TEST: {model}\n{'='*50}", flush=True)
    
    # Warmup
    try:
        requests.post(f"{OLLAMA_URL}/api/embed", json={"model": model, "input": ["warmup"]}, timeout=120)
    except Exception:
        print(f"Failed to load {model}, skipping.", flush=True)
        return
        
    batches = [sentences[i:i + batch_size] for i in range(0, len(sentences), batch_size)]
    
    start_time = time.time()
    total_chunks = 0
    failures = 0
    
    # Use ThreadPoolExecutor for continuous batching
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(embed_batch, model, batch): batch for batch in batches}
        
        # We will report progress incrementally
        last_report_time = start_time
        
        for future in futures:
            try:
                count = future.result()
                if count > 0:
                    total_chunks += count
                else:
                    failures += 1
            except Exception:
                failures += 1
                
            elapsed = time.time() - start_time
            # Report every 30 seconds
            if time.time() - last_report_time > 30:
                current_speed = (total_chunks / elapsed) * 60
                print(f"[{model}] {elapsed:.0f}s elapsed | Chunks: {total_chunks} | Speed: {current_speed:.1f} chunks/min", flush=True)
                last_report_time = time.time()
                
    final_time = time.time() - start_time
    final_speed = (total_chunks / final_time) * 60 if final_time > 0 else 0
    
    print(f"\n--- STRESS TEST RESULTS FOR {model} ---", flush=True)
    print(f"Total Duration: {final_time:.2f} seconds", flush=True)
    print(f"Total Sentences Embedded: {total_chunks}", flush=True)
    print(f"Average Sustained Speed: {final_speed:.1f} sentences/minute", flush=True)
    print(f"Failures/Timeouts: {failures}", flush=True)
    
    return {
        "model": model,
        "speed": final_speed,
        "chunks": total_chunks,
        "failures": failures
    }

if __name__ == "__main__":
    print(f"Starting Extensive Embedding Benchmark Script for {len(sentences)} sentences...", flush=True)
    
    results = []
    for m in MODELS_TO_TEST:
        res = benchmark_model(m, batch_size=32, max_workers=8)
        if res:
            results.append(res)
            
    print("\n\n" + "="*60, flush=True)
    print("FINAL EXTENSIVE EMBEDDING BENCHMARK RESULTS", flush=True)
    print("="*60, flush=True)
    for r in results:
        print(f"Model: {r['model']:<25} | Chunks: {r['chunks']:<6} | Sustained Speed: {r['speed']:.1f} c/min | Failures: {r['failures']}", flush=True)
