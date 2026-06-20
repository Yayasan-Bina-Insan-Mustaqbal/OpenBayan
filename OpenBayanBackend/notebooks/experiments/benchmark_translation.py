import os
import time
import requests
import json
from concurrent.futures import ThreadPoolExecutor, as_completed

OLLAMA_URL = "http://100.121.116.17:11434"

sample_texts = [
    "قال رسول الله صلى الله عليه وسلم: إنما الأعمال بالنيات وإنما لكل امرئ ما نوى.",
    "الدين النصيحة، قلنا لمن؟ قال: لله ولكتابه ولرسوله ولأئمة المسلمين وعامتهم.",
    "من حسن إسلام المرء تركه ما لا يعنيه.",
    "لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه.",
    "من كان يؤمن بالله واليوم الآخر فليقل خيرا أو ليصمت.",
    "الكلمة الطيبة صدقة.",
    "الطهور شطر الإيمان.",
    "لا تباغضوا ولا تحاسدوا ولا تدابروا وكونوا عباد الله إخوانا.",
    "اتق الله حيثما كنت وأتبع السيئة الحسنة تمحها وخالق الناس بخلق حسن.",
    "خيركم من تعلم القرآن وعلمه."
]

def get_all_models():
    try:
        res = requests.get(f"{OLLAMA_URL}/api/tags")
        res.raise_for_status()
        data = res.json()
        return [m["name"] for m in data.get("models", [])]
    except Exception as e:
        print(f"Failed to fetch models: {e}")
        return []

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
        res = requests.post(f"{OLLAMA_URL}/api/generate", json=payload, timeout=180)
        res.raise_for_status()
        data = res.json()
        return {
            "text": data.get("response", "").strip(),
            "eval_count": data.get("eval_count", 0),
            "eval_duration": data.get("eval_duration", 0) / 1e9
        }
    except Exception as e:
        return {"error": str(e)}

def benchmark_model_parallel(model: str, num_concurrent: int = 10):
    print(f"\n--- Benchmarking {model} (Parallel Translation) ---", flush=True)
    
    # Warmup
    try:
        requests.post(f"{OLLAMA_URL}/api/generate", json={"model": model, "prompt": "Hi", "stream": False}, timeout=120)
    except Exception:
        print(f"Failed to load {model}", flush=True)
        return None
        
    start_time = time.time()
    total_tokens = 0
    translations = []
    
    with ThreadPoolExecutor(max_workers=num_concurrent) as executor:
        futures = {executor.submit(translate_sentence, model, text): text for text in sample_texts}
        for future in as_completed(futures):
            res = future.result()
            if "error" not in res:
                total_tokens += res["eval_count"]
                translations.append(res["text"])
            else:
                print(f"Error during translation: {res['error']}", flush=True)
                
    total_time = time.time() - start_time
    speed = total_tokens / total_time if total_time > 0 else 0
    
    print(f"Sample Output 1: {translations[0] if translations else 'None'}", flush=True)
    print(f"Sample Output 2: {translations[1] if len(translations)>1 else 'None'}", flush=True)
    print(f"Total Time: {total_time:.2f}s | Speed: {speed:.1f} tokens/sec (Batched)", flush=True)
    
    return {
        "model": model,
        "speed": speed,
        "time": total_time,
        "sample": translations[0] if translations else "None"
    }

if __name__ == "__main__":
    models = get_all_models()
    skip_keywords = ["embed", "mxbai", "nomic", "bge", "llava", "minicpm", "ocr", "vl", "sqlcoder", "granite-code", "deepseek-coder"]
    valid_models = [m for m in models if not any(k in m.lower() for k in skip_keywords)]
    
    print(f"Found {len(valid_models)} valid generative models.", flush=True)
    results = []
    
    for m in valid_models:
        res = benchmark_model_parallel(m, num_concurrent=10)
        if res:
            results.append(res)
            
    print("\n\n" + "="*60, flush=True)
    print("FINAL PARALLEL TRANSLATION BENCHMARK RESULTS", flush=True)
    print("="*60, flush=True)
    
    results.sort(key=lambda x: x["speed"], reverse=True)
    
    with open("translation_benchmark_results.md", "w") as f:
        f.write("# Translation Model Benchmark\n\n")
        f.write("| Model | Speed (tokens/sec) | Time for 10 sentences | Sample Output |\n")
        f.write("|---|---|---|---|\n")
        for r in results:
            print(f"Model: {r['model']:<25} | Speed: {r['speed']:.1f} t/s | Time: {r['time']:.2f}s", flush=True)
            sample = r['sample'].replace('\n', ' ')
            f.write(f"| `{r['model']}` | {r['speed']:.1f} | {r['time']:.2f}s | {sample} |\n")
    print("Results saved to translation_benchmark_results.md")
