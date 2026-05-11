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

def recursive_arabic_chunker(text: str, max_words: int = 500, overlap_percent: float = 0.15) -> List[str]:
    # 1. Normalize
    text = text.replace('\u200F', '').replace('\u200E', '')
    
    # 2. Split by structural anchors (numbered entries or line breaks)
    # The entries in Mizan al-I'tidal are often numbered
    blocks = [b.strip() for b in re.split(r'(\d+\s*-\s*)', text) if b.strip()]
    
    # Recombine markers with their content
    refined_blocks = []
    i = 0
    while i < len(blocks):
        if re.match(r'^\d+\s*-\s*$', blocks[i]):
            if i + 1 < len(blocks):
                refined_blocks.append(blocks[i] + blocks[i+1])
                i += 2
            else:
                refined_blocks.append(blocks[i])
                i += 1
        else:
            refined_blocks.append(blocks[i])
            i += 1
            
    chunks = []
    current_chunk = []
    current_words = 0
    overlap_size = int(max_words * overlap_percent)

    for block in refined_blocks:
        block_words = block.split()
        if current_words + len(block_words) <= max_words:
            current_chunk.append(block)
            current_words += len(block_words)
        else:
            chunks.append("\n".join(current_chunk))
            overlap_content = current_chunk[-1].split()[-overlap_size:] if current_chunk else []
            current_chunk = [" ".join(overlap_content), block] if overlap_content else [block]
            current_words = len(overlap_content) + len(block_words)
            
    if current_chunk:
        chunks.append("\n".join(current_chunk))
    return chunks

@task(name="process-rijal-task", retries=2, retry_delay_seconds=30)
def process_and_save_rijal_task(content: str, page_id: str, chunk_idx: int):
    logger = get_run_logger()
    if not content or len(content.strip()) < 10: return
    
    # --- HYBRID FAST-PATH: Regex for narrator names ---
    # Pattern: [ID] - [Name]
    hybrid_narrators = []
    matches = re.finditer(r'^(\d+)\s*-\s*([\u0621-\u064A\s]+)', content, re.MULTILINE)
    for m in matches:
        nar_id_num, name = m.groups()
        if len(name.strip().split()) >= 2: # Likely a full name
            hybrid_narrators.append({
                "name": name.strip(),
                "reliability": "",
                "biography_summary": "",
                "teachers": [],
                "students": []
            })

    # 1. Extraction (LLM)
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Extract narrators from this text:\n\n{content}"}
        ],
        "format": "json",
        "stream": False
    }
    
    extraction = None
    try:
        response = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=300)
        response.raise_for_status()
        data = response.json()
        extraction = PageRijalExtraction.parse_llm_response(data["message"]["content"])
    except Exception as e:
        logger.error(f"Extraction Error for chunk ({len(content)} chars): {e}")
        return

    if not extraction or not extraction.narrators:
        if hybrid_narrators:
            extraction = PageRijalExtraction(narrators=hybrid_narrators)
        else:
            return

    # 2. Saving to Graph
    try:
        with Surreal(SURREAL_URL) as db:
            db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
            db.use(SURREAL_NS, SURREAL_DB)
            
            def clean_id(name: str):
                clean = re.sub(r'[^\w\u0621-\u064A]', '_', name.strip())
                return clean.replace("__", "_").strip("_").lower()

            id_str = page_id.replace("book_page:", "").replace("`", "")
            page_rid = RecordID("book_page", id_str)

            for narrator in extraction.narrators:
                if not narrator.name or not narrator.name.strip(): continue
                
                try:
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
                        "id": nar_rid, "name": narrator.name,
                        "rel": narrator.reliability or "",
                        "sum": narrator.biography_summary or "",
                        "notes": narrator.biography_summary or ""
                    })
                    
                    db.query("""
                        RELATE $pid->mentions->$nid SET grade_given = $grade, chunk_index = $idx;
                    """, {
                        "pid": page_rid, "nid": nar_rid,
                        "grade": narrator.reliability or "", "idx": chunk_idx
                    })
                    
                    for teacher in narrator.teachers:
                        if not teacher or not teacher.strip(): continue
                        t_id = clean_id(teacher)
                        if not t_id: continue
                        t_rid = RecordID("entity", t_id)
                        db.query("UPSERT $id SET name = $n, type = 'Person'", {"id": t_rid, "n": teacher})
                        db.query("RELATE $tid->narrated_to->$nid", {"tid": t_rid, "nid": nar_rid})
                    
                    for student in narrator.students:
                        if not student or not student.strip(): continue
                        s_id = clean_id(student)
                        if not s_id: continue
                        s_rid = RecordID("entity", s_id)
                        db.query("UPSERT $id SET name = $n, type = 'Person'", {"id": s_rid, "n": student})
                        db.query("RELATE $nid->narrated_to->$sid", {"nid": nar_rid, "sid": s_rid})
                except Exception as e:
                    logger.error(f"Failed to save narrator {narrator.name}: {e}")
    except Exception as e:
        logger.error(f"Task DB Connection Error: {e}")

@flow(name="Ilm al-Rijal Extraction Flow", task_runner=ThreadPoolTaskRunner(max_workers=14))
def rijal_extraction_flow(limit_pages: Optional[int] = None):
    logger = get_run_logger()
    source_rid = RecordID("source", "shamela_ميزان_الإعتدال_فى_نقد_الرجال__الذهبي__ت_البجاوي__ط_الذهبي")
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        logger.info(f"Connected to SurrealDB for Rijal Extraction using {OLLAMA_MODEL}")
        
        total_processed = 0
        batch_size = 30 
        
        while True:
            q = "SELECT id, content FROM book_page WHERE source = $src AND processed_for_rijal = false LIMIT $limit"
            res = db.query(q, {"src": source_rid, "limit": batch_size})
            pages = res if isinstance(res, list) and (not res or isinstance(res[0], dict)) else (res[0] if res and isinstance(res[0], list) else [])
            
            if not pages:
                logger.info("No more pending pages for Mizan al-I'tidal.")
                break
                
            logger.info(f"  Batch Processing {len(pages)} pending pages.")
            
            futures = []
            for page in pages:
                if not isinstance(page, dict): continue
                # RECURSIVE CHUNKER
                chunks = recursive_arabic_chunker(page["content"], max_words=400)
                for idx, chunk in enumerate(chunks):
                    futures.append(process_and_save_rijal_task.submit(chunk, str(page["id"]), idx))
            
            # Wait for batch completion
            for future in futures:
                future.result()
            
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
