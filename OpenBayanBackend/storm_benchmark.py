import os
import time
import json
import asyncio
import httpx
import re
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field
from prefect import flow, task, get_run_logger
from prefect.task_runners import ThreadPoolTaskRunner
from dotenv import load_dotenv

load_dotenv()

# --- Configurations ---
OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
# Using available models + some new targets
MODELS = ["llama3.1:latest", "llama3.2:3b", "qwen2.5:7b", "phi3.5:latest", "aya:latest"]

# Experiment Database (Isolated)
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = "openbayan"
SURREAL_DB = "experiment" 

# --- Pydantic Models ---
class ExtractionEntry(BaseModel):
    word: str = Field(alias="term", default="")
    definition: str = Field(default="")
    
    def __init__(self, **data):
        if "term" in data and "word" not in data:
            data["word"] = data["term"]
        super().__init__(**data)

class PageExtraction(BaseModel):
    entries: List[ExtractionEntry]

    @classmethod
    def parse_llm_response(cls, raw_content: str):
        try:
            # Clean markdown code blocks if any
            clean_content = raw_content.replace("```json", "").replace("```", "").strip()
            parsed = json.loads(clean_content)
            
            if "entries" not in parsed:
                if isinstance(parsed, list):
                    parsed = {"entries": parsed}
                elif "word" in parsed or "term" in parsed:
                    parsed = {"entries": [parsed]}
                else:
                    raise ValueError("No entries found in JSON")
            
            # Filter empties
            valid_entries = []
            for e in parsed.get("entries", []):
                if (e.get("word") or e.get("term")) and e.get("definition"):
                    valid_entries.append(e)
            
            parsed["entries"] = valid_entries
            return cls.model_validate(parsed)
        except Exception as e:
            raise ValueError(f"Parsing failed: {e}. Raw: {raw_content[:100]}")

class BenchmarkResult(BaseModel):
    model: str
    strategy: str
    sample_type: str
    duration_seconds: float
    char_count: int
    entry_count: int
    success: bool
    error: Optional[str] = None

# --- Splitting Strategies ---

def strategy_recursive_buffer(text: str, min_words: int = 50) -> List[str]:
    """Hierarchical split: Paragraph -> Sentence -> Word Buffer."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    sentences = []
    for p in paragraphs:
        # Improved regex for Arabic punctuation
        sents = re.split(r'(?<=[.!?؟])\s+', p)
        sentences.extend([s.strip() for s in sents if s.strip()])
    
    chunks = []
    current_buffer = []
    current_word_count = 0
    
    for s in sentences:
        words = s.split()
        current_buffer.append(s)
        current_word_count += len(words)
        if current_word_count >= min_words:
            chunks.append(" ".join(current_buffer))
            current_buffer = []
            current_word_count = 0
    if current_buffer:
        chunks.append(" ".join(current_buffer))
    return chunks

def strategy_dot_newline_50(text: str, min_words: int = 50) -> List[str]:
    """Strictly split by . or \n then buffer."""
    # Split by explicit newline or literal dot
    raw_splits = re.split(r'[\n.]+', text)
    sentences = [s.strip() for s in raw_splits if s.strip()]
    
    chunks = []
    current_buffer = []
    current_word_count = 0
    
    for s in sentences:
        words = s.split()
        current_buffer.append(s)
        current_word_count += len(words)
        if current_word_count >= min_words:
            chunks.append(" ".join(current_buffer))
            current_buffer = []
            current_word_count = 0
    if current_buffer:
        chunks.append(" ".join(current_buffer))
    return chunks

# --- Sample Data ---
SAMPLES = {
    "dictionary": "الْقَنَاعَةُ: الرِّضا بِالقَسْمِ. قَنِعَ قَنَعاً وَقَنَاعَةً: رَضِيَ، فَهُوَ قانِعٌ وَقَنِيعٌ. وَفِي الْحَدِيثِ: الْقَنَاعَةُ كَنْزٌ لَا يَفْنَى؛ القَنَاعة: الِالْتِزَامُ بِمَا آتَاهُ اللَّهُ مِنَ الرِّزْقِ.",
    "hadith_long": "عَنْ أَبِي هُرَيْرَةَ رَضِيَ اللَّهُ عَنْهُ قَالَ: قَالَ رَسُولُ اللَّهِ ﷺ: (مَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيَقُلْ خَيْرًا أَوْ لِيَصْمُتْ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيُكْرِمْ جَارَهُ، وَمَنْ كَانَ يُؤْمِنُ بِاللَّهِ وَالْيَوْمِ الْآخِرِ فَلْيُكْرِمْ ضَيْفَهُ). رَوَاهُ الْبُخَارِيُّ وَمُسْلِمٌ.",
    "quran_long": "يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا تَدَايَنْتُمْ بِدَيْنٍ إِلَى أَجَلٍ مُسَمًّى فَاكْتُبُوهُ وَلْيَكْتُبْ بَيْنَكُمْ كَاتِبٌ بِالْعَدْلِ وَلَا يَأْبَ كَاتِبٌ أَنْ يَكْتُبَ كَمَا عَلَّمَهُ اللَّهُ فَلْيَكْتُبْ وَلْيُمْلِلِ الَّذِي عَلَيْهِ الْحَقُّ وَلْيَتَّقِ اللَّهَ رَبَّهُ وَلَا يَبْخَسْ مِنْهُ شَيْئًا فَإِنْ كَانَ الَّذِي عَلَيْهِ الْحَقُّ سَفِيهًا أَوْ ضَعِيفًا أَوْ لَا يَسْتَطِيعُ أَنْ يُمْلِلَ هُوَ فَلْيُمْلِلْ وَلِيُّهُ بِالْعَدْلِ وَاسْتَشْهِدُوا شَهِيدَيْنِ مِنْ رِجَالِكُمْ فَإِنْ لَمْ يَكُونَا رَجُلَيْنِ فَرَجُلٌ وَامْرَأَتَانِ مِمَّنْ تَرْضَوْنَ مِنَ الشُّهَدَاءِ أَنْ تَضِلَّ إِحْدَاهُمَا فَتُذَكِّرَ إِحْدَاهُمَا الْأُخْرَى..."
}

# --- Tasks ---

@task(name="storm-extraction-job")
async def process_extraction_job(model: str, strategy: str, sample_type: str, chunk_text: str) -> BenchmarkResult:
    logger = get_run_logger()
    start_time = time.time()
    
    prompt = f"Extract dictionary-style entities from this text. Return JSON with 'entries' list. Text: {chunk_text}"
    
    payload = {
        "model": model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": False,
        "format": "json"
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            resp = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
            resp.raise_for_status()
            result_data = resp.json()
            content = result_data["message"]["content"]
            
            # Pydantic Validation
            parsed = PageExtraction.parse_llm_response(content)
            
            return BenchmarkResult(
                model=model,
                strategy=strategy,
                sample_type=sample_type,
                duration_seconds=time.time() - start_time,
                char_count=len(chunk_text),
                entry_count=len(parsed.entries),
                success=True
            )
        except Exception as e:
            return BenchmarkResult(
                model=model,
                strategy=strategy,
                sample_type=sample_type,
                duration_seconds=time.time() - start_time,
                char_count=len(chunk_text),
                entry_count=0,
                success=False,
                error=str(e)
            )

@flow(name="High-Concurrency-Storm-Benchmark", task_runner=ThreadPoolTaskRunner(max_workers=5))
async def storm_benchmark_flow():
    logger = get_run_logger()
    logger.info(f"Starting Storm Benchmark on DB: {SURREAL_DB}")
    
    strategies = ["native", "recursive_buffer", "dot_newline_50"]
    all_futures = []
    
    for model in MODELS:
        for s_name, s_text in SAMPLES.items():
            for strategy in strategies:
                if strategy == "recursive_buffer":
                    chunks = strategy_recursive_buffer(s_text, 50)
                elif strategy == "dot_newline_50":
                    chunks = strategy_dot_newline_50(s_text, 50)
                else:
                    chunks = [s_text] # Native
                
                for c in chunks:
                    # SUBMIT TO THE STORM
                    all_futures.append(
                        process_extraction_job.submit(model, strategy, s_name, c)
                    )
    
    logger.info(f"Launched {len(all_futures)} parallel jobs. Awaiting results...")
    
    results = []
    for f in all_futures:
        results.append(f.result().model_dump())
        
    # Save results
    with open("storm_benchmark_results.json", "w") as f:
        json.dump(results, f, indent=2)
    
    logger.info("✅ Benchmark Report Generated: storm_benchmark_results.json")

if __name__ == "__main__":
    import asyncio
    asyncio.run(storm_benchmark_flow())
