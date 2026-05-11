import os
import time
import json
import requests
from typing import List, Dict, Optional
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

# --- Configurations for Benchmarking ---
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
MODELS_TO_TEST = [
    "llama3.1:latest",   # Current standard (8b)
    "llama3.2:3b",       # Lightweight candidate
    "gemma2:2b",         # Ultra-lightweight candidate
    "mistral:latest"     # Alternative architecture
]

# --- Sample Data for Different Text Types ---
BENCHMARK_SAMPLES = {
    "dictionary": {
        "title": "Lisan al-Arab (Lexical)",
        "content": "الْقَنَاعَةُ: الرِّضا بِالقَسْمِ. قَنِعَ قَنَعاً وَقَنَاعَةً: رَضِيَ، فَهُوَ قانِعٌ وَقَنِيعٌ. وَفِي الْحَدِيثِ: الْقَنَاعَةُ كَنْزٌ لَا يَفْنَى؛ القَنَاعة: الِالْتِزَامُ بِمَا آتَاهُ اللَّهُ مِنَ الرِّزْقِ."
    },
    "quran_short": {
        "title": "Surah Al-Ikhlas (Short Ayah)",
        "content": "قُلْ هُوَ اللَّهُ أَحَدٌ (1) اللَّهُ الصَّمَدُ (2) لَمْ يَلِدْ وَلَمْ يُولَدْ (3) وَلَمْ يَكُن لَّهُ كُفُوًا أَحَدٌ (4)"
    },
    "quran_long": {
        "title": "Ayat al-Dayn (Long Ayah)",
        "content": "يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنْتُمْ بِدَيْنٍ إِلَى أَجَلٍ مُسَمًّى فَاكْتُبُوهُ وَلْيَكْتُبْ بَيْنَكُمْ كَاتِبٌ بِالْعَدْلِ وَلَا يَأْبَ كَاتِبٌ أَنْ يَكْتُبَ كَمَا عَلَّمَهُ اللَّهُ فَلْيَكْتُبْ وَلْيُمْلِلِ الَّذِي عَلَيْهِ الْحَقُّ وَلْيَتَّقِ اللَّهَ رَبَّهُ وَلَا يَبْخَسْ مِنْهُ شَيْئًا..."
    },
    "hadith_short": {
        "title": "Arba'in Nawawi (Short Hadith)",
        "content": "عَنْ عُمَرَ بْنِ الْخَطَّابِ رَضِيَ اللهُ عَنْهُ قَالَ: سَمِعْتُ رَسُولَ اللهِ صلى الله عليه وسلم يَقُولُ: (إنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى...)"
    },
    "hadith_long": {
        "title": "Hadith of Gabriel (Long Hadith/Narrative)",
        "content": "بَيْنَمَا نَحْنُ جُلُوسٌ عِنْدَ رَسُولِ اللهِ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ ذَاتَ يَوْمٍ، إِذْ طَلَعَ عَلَيْنَا رَجُلٌ شَدِيدُ بَيَاضِ الثِّيَابِ، شَدِيدُ سَوَادِ الشَّعَرِ... قَالَ: فَأَخْبِرْنِي عَنِ الْإِيمَانِ؟ قَالَ: أَنْ تُؤْمِنَ بِاللهِ وَمَلَائِكَتِهِ وَكُتُبِهِ وَرُسُلِهِ وَالْيَوْمِ الْآخِرِ..."
    },
    "tafsir": {
        "title": "Tafsir Ibn Kathir",
        "content": "وقوله: { صِبْغَةَ اللَّهِ } قال الضحاك، عن ابن عباس: دين الله. وكذا روي عن مجاهد، وأبي العالية، وعكرمة، وقتادة، والربيع بن أنس، والسدي، وقتادة، والضحاك، وزيد بن أسلم. ومعنى قوله { وَمَنْ أَحْسَنُ مِنَ اللَّهِ صِبْغَةً } أي: لا أحد أحسن دينا من الله."
    },
    "general": {
        "title": "Al-Ghazali - Ihya (General/Thematic)",
        "content": "اعلم أن الصبر نصف الإيمان، واليقين نصفه الآخر؛ فإن الإيمان هو مجموع أعمال القلوب والجوارح، وهي تنقسم إلى ما يجب الصبر عليه وإلى ما يجب الشكر عليه."
    }
}

# --- New SBD Candidate: pySBD ---
# Note: Needs 'pip install pysbd'
try:
    import pysbd
    seg = pysbd.Segmenter(language="ar", clean=False)
except ImportError:
    seg = None

# --- Arabic Abbreviation Samples ---
ABBREVIATION_SAMPLES = [
    "قَالَ رَسُولُ اللَّهِ ﷺ: (الدِّينُ النَّصِيحَةُ). قُلْنَا: لِمَنْ؟ قَالَ: لِلَّهِ وَلِكِتَابِهِ...",
    "رَوَاهُ الْبُخَارِيُّ (ت ٢٥٦ هـ) وَمُسْلِمٌ (ت ٢٦١ هـ) فِي صَحِيحَيْهِمَا.",
    "قَالَ ابْنُ عَبَّاسٍ رَضِيَ اللَّهُ عَنْهُمَا: التَّفْسِيرُ عَلَى أَرْبَعَةِ أَوْجُهٍ."
]

@task(name="benchmark-sbd-strategy")
def benchmark_sbd_accuracy(content: str):
    """Compare basic split vs pySBD on Arabic abbreviations."""
    basic = content.split(".")
    
    if seg:
        pysbd_res = seg.segment(content)
    else:
        pysbd_res = ["pySBD not installed"]
        
    return {
        "basic_count": len(basic),
        "pysbd_count": len(pysbd_res),
        "samples": pysbd_res
    }

@task(name="benchmark-embedding-batching")
def benchmark_embedding_efficiency(chunks: List[str], batch_size: int = 32):
    """Compare sequential vs batch embedding speed."""
    # Sequential
    start_seq = time.time()
    for chunk in chunks[:batch_size]:
        # Simulate API call
        pass 
    duration_seq = time.time() - start_seq
    
    # Batch (Simulated - assuming model/API supports it)
    start_batch = time.time()
    # Simulate single large API call
    pass
    duration_batch = time.time() - start_batch
    
    return {
        "sequential_ms": duration_seq * 1000,
        "batch_ms": duration_batch * 1000,
        "speedup_factor": duration_seq / (duration_batch or 0.001)
    }

def run_ollama_query(model: str, system: str, prompt: str, format_json: bool = True):
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt}
        ],
        "stream": False
    }
    if format_json:
        payload["format"] = "json"
    
    start_time = time.time()
    try:
        response = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=300)
        duration = time.time() - start_time
        return response.json(), duration
    except Exception as e:
        return {"error": str(e)}, time.time() - start_time

def benchmark():
    results = []
    
    for model in MODELS_TO_TEST:
        print(f"\n=== Testing Model: {model} ===")
        for sample_key, sample_data in BENCHMARK_SAMPLES.items():
            print(f"  Testing Type: {sample_key}")
            
            # 1. Native JSON Strategy
            sys_msg = "Extract structured data from the text. Return JSON with 'entries' list containing 'word', 'definition', and 'entities'."
            res, duration = run_ollama_query(model, sys_msg, sample_data["content"])
            
            results.append({
                "model": model,
                "type": sample_key,
                "strategy": "native_json",
                "duration": duration,
                "char_count": len(sample_data["content"]),
                "success": "error" not in res
            })
            
    # Save results for analysis
    with open("extraction_benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)

if __name__ == "__main__":
    print("Benchmark code prepared. Ready to run for evaluation.")
    # benchmark() # Commented out as requested
