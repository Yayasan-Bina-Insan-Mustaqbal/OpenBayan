import os
import json
import re
import requests
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, field_validator
from surrealdb import Surreal, RecordID
from prefect import flow, task, get_run_logger
from prefect.task_runners import ThreadPoolTaskRunner
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_LLM_MODEL", "qwen2.5:7b")

class NarratorExtraction(BaseModel):
    name: str = ""
    reliability: str = ""
    biography_summary: str = ""
    teachers: List[str] = []
    students: List[str] = []

    @field_validator('reliability', 'biography_summary', mode='before')
    @classmethod
    def ensure_string(cls, v):
        if v is None:
            return ""
        return str(v)

    @field_validator('teachers', 'students', mode='before')
    @classmethod
    def ensure_list_of_strings(cls, v):
        if not isinstance(v, list):
            return []
        cleaned = []
        for item in v:
            if isinstance(item, dict):
                # Handle cases like {'name': '...'} or {'teacher': '...'}
                cleaned.append(str(next(iter(item.values()), "")))
            elif item:
                cleaned.append(str(item))
        return cleaned

class PageRijalExtraction(BaseModel):
    narrators: List[NarratorExtraction] = []

    @classmethod
    def parse_llm_response(cls, raw_content: str):
        try:
            # Robust JSON extraction
            import re
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_content, re.DOTALL)
            if match:
                clean_content = match.group(1).strip()
            else:
                match = re.search(r"(\{.*\})", raw_content, re.DOTALL)
                if match:
                    clean_content = match.group(1).strip()
                else:
                    clean_content = raw_content.strip()
            
            parsed = json.loads(clean_content)
            
            if "narrators" not in parsed:
                if isinstance(parsed, list):
                    parsed = {"narrators": parsed}
                elif "name" in parsed:
                    parsed = {"narrators": [parsed]}
                else:
                    return None
            
            valid_narrators = []
            for n in parsed.get("narrators", []):
                if n.get("name"):
                    valid_narrators.append(n)
            
            parsed["narrators"] = valid_narrators
            if not valid_narrators: return None
            return cls.model_validate(parsed)
        except Exception as e:
            raise ValueError(f"JSON Parse Error: {e}. Raw content: {raw_content[:200]}...")

SYSTEM_PROMPT = """
You are an expert in Ilm al-Rijal (Hadith narrator criticism). Your task is to extract structured narrator biographies from the text of 'Mizan al-I'tidal' by Al-Dhahabi.
For each narrator entry in the text, extract:
- 'name': The full name of the narrator.
- 'reliability': The primary reliability grade mentioned (e.g., 'ثقة', 'ضعيف', 'كذاب', 'صدوق').
- 'biography_summary': A concise summary of the biographical details provided.
- 'teachers': A list of scholars the narrator learned from (shuyukh).
- 'students': A list of scholars who narrated from this person (rawah).

CRITICAL: Return ONLY a valid JSON object with the key 'narrators' containing an array of objects. 
If no narrators are found in this chunk, return {"narrators": []}.
Ensure all string fields are provided, even if empty.
"""

def strategy_dot_newline_50(text: str, min_words: int = 50) -> List[str]:
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

@task(name="extract-rijal-from-chunk", retries=2, retry_delay_seconds=30)
def extract_rijal_from_chunk(content: str) -> Optional[PageRijalExtraction]:
    if not content or len(content.strip()) < 10: return None
    
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Extract narrators from this text:\n\n{content}"}
        ],
        "format": "json",
        "stream": False
    }
    try:
        response = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=300)
        response.raise_for_status()
        data = response.json()
        return PageRijalExtraction.parse_llm_response(data["message"]["content"])
    except Exception as e:
        get_run_logger().error(f"Extraction Error for chunk ({len(content)} chars): {e}")
        return None

def save_rijal_to_graph_sync(db: Surreal, extraction: PageRijalExtraction, page_id: str, chunk_idx: int):
    logger = get_run_logger()
    
    def clean_id(name: str):
        clean = re.sub(r'[^\w\u0621-\u064A]', '_', name.strip())
        return clean.replace("__", "_").strip("_").lower()

    id_str = page_id.replace("book_page:", "").replace("`", "")
    page_rid = RecordID("book_page", id_str)

    for narrator in extraction.narrators:
        if not narrator.name or not narrator.name.strip(): continue
        
        try:
            # 1. Upsert Narrator
            nar_id = clean_id(narrator.name)
            if not nar_id: continue
            nar_rid = RecordID("entity", nar_id)
            
            db.query("""
                UPSERT $id SET 
                    name = $name, 
                    type = 'Person', 
                    reliability = $rel, 
                    summary = $sum,
                    biographical_notes = $notes;
            """, {
                "id": nar_rid,
                "name": narrator.name,
                "rel": narrator.reliability or "",
                "sum": narrator.biography_summary or "",
                "notes": narrator.biography_summary or ""
            })
            
            # 2. Link Page to Narrator (mentions)
            db.query("""
                RELATE $pid->mentions->$nid SET grade_given = $grade, chunk_index = $idx;
            """, {
                "pid": page_rid,
                "nid": nar_rid,
                "grade": narrator.reliability or "",
                "idx": chunk_idx
            })
            
            # 3. Handle Teachers
            for teacher in narrator.teachers:
                if not teacher or not teacher.strip(): continue
                t_id = clean_id(teacher)
                if not t_id: continue
                t_rid = RecordID("entity", t_id)
                
                db.query("UPSERT $id SET name = $n, type = 'Person'", {"id": t_rid, "n": teacher})
                db.query("RELATE $tid->narrated_to->$nid", {"tid": t_rid, "nid": nar_rid})
            
            # 4. Handle Students
            for student in narrator.students:
                if not student or not student.strip(): continue
                s_id = clean_id(student)
                if not s_id: continue
                s_rid = RecordID("entity", s_id)
                
                db.query("UPSERT $id SET name = $n, type = 'Person'", {"id": s_rid, "n": student})
                db.query("RELATE $nid->narrated_to->$sid", {"nid": nar_rid, "sid": s_rid})
                
        except Exception as e:
            logger.error(f"Failed to save narrator {narrator.name}: {e}")

@flow(name="Ilm al-Rijal Extraction Flow", task_runner=ThreadPoolTaskRunner(max_workers=6))
def rijal_extraction_flow(limit_pages: Optional[int] = None):
    logger = get_run_logger()
    source_rid = RecordID("source", "shamela_ميزان_الإعتدال_فى_نقد_الرجال__الذهبي__ت_البجاوي__ط_الذهبي")
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        logger.info(f"Connected to SurrealDB for Rijal Extraction using {OLLAMA_MODEL}")
        
        total_processed = 0
        batch_size = 10 
        
        while True:
            q = "SELECT id, content FROM book_page WHERE source = $src AND processed_for_rijal = false LIMIT $limit"
            res = db.query(q, {"src": source_rid, "limit": batch_size})
            
            pages = res if isinstance(res, list) and (not res or isinstance(res[0], dict)) else (res[0] if res and isinstance(res[0], list) else [])
            
            if not pages:
                logger.info("No more pending pages for Mizan al-I'tidal.")
                break
                
            logger.info(f"  Batch Processing {len(pages)} pending pages.")
            
            page_chunks_map = {}
            futures = []
            
            for page in pages:
                if not isinstance(page, dict): continue
                chunks = strategy_dot_newline_50(page["content"], min_words=50)
                page_chunks_map[str(page["id"])] = chunks
                for idx, chunk in enumerate(chunks):
                    futures.append((str(page["id"]), idx, extract_rijal_from_chunk.submit(chunk)))
            
            # Wait and save
            for page_id, idx, future in futures:
                extraction = future.result()
                if extraction:
                    save_rijal_to_graph_sync(db, extraction, page_id, idx)
            
            # Mark processed
            for page in pages:
                id_str = str(page["id"]).replace("book_page:", "").replace("`", "")
                rid = RecordID("book_page", id_str)
                db.query("UPDATE $id SET processed_for_rijal = true", {"id": rid})
                total_processed += 1
            
            if limit_pages and total_processed >= limit_pages:
                return

if __name__ == "__main__":
    rijal_extraction_flow()
