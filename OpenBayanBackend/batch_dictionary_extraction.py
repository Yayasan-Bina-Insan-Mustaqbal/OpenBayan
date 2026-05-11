import os
import json
import re
import requests
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, field_validator, AliasChoices
from surrealdb import Surreal, RecordID
from prefect import flow, task, get_run_logger
from prefect.task_runners import ThreadPoolTaskRunner
from dotenv import load_dotenv

load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://100.121.116.17:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_LLM_MODEL", "qwen2.5:7b")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "mxbai-embed-large:latest")

WIKI_CACHE = {}
WORD_EXISTENCE_CACHE = set()

# Pydantic models
class EntityMention(BaseModel):
    name: str = Field(validation_alias=AliasChoices("name", "term"), default="")
    type: str = "Concept"
    
    def __init__(self, **data):
        if "term" in data and "name" not in data:
            data["name"] = data["term"]
        super().__init__(**data)

    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not isinstance(v, str): return "N/A"
        return v.strip()

class DictionaryEntry(BaseModel):
    root: str = ""
    word: str = Field(validation_alias=AliasChoices("word", "term"), default="")
    definition: str = ""
    entities: List[EntityMention] = []
    
    def __init__(self, **data):
        if "term" in data and "word" not in data:
            data["word"] = data["term"]
        super().__init__(**data)

    @field_validator('root', 'word', 'definition')
    @classmethod
    def validate_fields(cls, v):
        if not v or not isinstance(v, str): return ""
        return v.strip()

class PageExtraction(BaseModel):
    entries: List[DictionaryEntry]

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
            
            if "entries" not in parsed:
                if isinstance(parsed, list):
                    parsed = {"entries": parsed}
                elif "word" in parsed or "term" in parsed:
                    parsed = {"entries": [parsed]}
                else:
                    return None
            
            valid_entries = []
            for e in parsed.get("entries", []):
                if (e.get("word") or e.get("term")) and e.get("definition"):
                    valid_entries.append(e)
            
            parsed["entries"] = valid_entries
            if not valid_entries: return None
            return cls.model_validate(parsed)
        except Exception as e:
            raise ValueError(f"JSON Parse Error: {e}. Raw content: {raw_content[:200]}...")

SYSTEM_PROMPT = """
You are an expert Arabic lexicographer. Extract structured dictionary entries from the text.
Return ONLY valid JSON with this exact structure:
{
  "entries": [
    {
      "root": "...",
      "word": "...",
      "definition": "...",
      "entities": [{"name": "...", "type": "Person|Place|Group|Event|Concept"}]
    }
  ]
}
If data is missing, use empty strings. Do not omit fields. If the text does not contain a dictionary definition, return {"entries": []}.
"""

def recursive_arabic_chunker(text: str, max_words: int = 400, overlap_percent: float = 0.15) -> List[str]:
    # 1. Normalize (Strip BiDi markers)
    text = text.replace('\u200F', '').replace('\u200E', '')
    
    # 2. Split by structural blocks (lines)
    blocks = [b.strip() for b in re.split(r'\n+', text) if b.strip()]
    
    chunks = []
    current_chunk = []
    current_words = 0
    overlap_size = int(max_words * overlap_percent)

    for block in blocks:
        block_words = block.split()
        if current_words + len(block_words) <= max_words:
            current_chunk.append(block)
            current_words += len(block_words)
        else:
            chunks.append("\n".join(current_chunk))
            # Start new chunk with overlap
            overlap_content = current_chunk[-1].split()[-overlap_size:] if current_chunk else []
            current_chunk = [" ".join(overlap_content), block] if overlap_content else [block]
            current_words = len(overlap_content) + len(block_words)
            
    if current_chunk:
        chunks.append("\n".join(current_chunk))
    return chunks

@task(name="process-chunk-task", retries=2, retry_delay_seconds=30)
def process_and_save_chunk_task(content: str, page_id: str, source_id: str, chunk_idx: int):
    logger = get_run_logger()
    if not content or len(content.strip()) < 5: return
    
    # --- HYBRID FAST-PATH: Regex Extraction for simple entries ---
    hybrid_entries = []
    lines = content.split('\n')
    for line in lines:
        # Match "Word : Definition" or "Word (Root) Definition"
        match = re.match(r'^([\u0621-\u064A]+)\s*[:]\s*(.*)', line.strip())
        if match:
            word, definition = match.groups()
            if len(definition) > 10:
                hybrid_entries.append({
                    "word": word,
                    "definition": definition,
                    "root": "",
                    "entities": []
                })

    # 1. Extraction (LLM)
    payload = {
        "model": OLLAMA_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Extract entries from this text:\n\n{content}"}
        ],
        "format": "json",
        "stream": False
    }
    
    extraction = None
    try:
        response = requests.post(f"{OLLAMA_URL}/api/chat", json=payload, timeout=300)
        response.raise_for_status()
        data = response.json()
        extraction = PageExtraction.parse_llm_response(data["message"]["content"])
    except Exception as e:
        logger.error(f"Extraction Error for chunk ({len(content)} chars): {e}")
        return

    if not extraction or not extraction.entries:
        if hybrid_entries:
            extraction = PageExtraction(entries=hybrid_entries)
        else:
            return

    # 2. Embedding & Saving
    try:
        with Surreal(SURREAL_URL) as db:
            db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
            db.use(SURREAL_NS, SURREAL_DB)
            
            def to_rid(rec_str):
                if isinstance(rec_str, RecordID): return rec_str
                s = str(rec_str).replace("`", "")
                if ":" in s:
                    parts = s.split(":", 1)
                    return RecordID(parts[0], parts[1])
                return rec_str

            page_rid = to_rid(page_id)
            source_rid = to_rid(source_id)
            ALLOWED_TYPES = ['Divine', 'Celestial', 'Prophetic', 'Person', 'Group', 'Place', 'Scripture', 'Afterlife', 'Object', 'Event', 'Concept']

            for entry in extraction.entries:
                if not entry.word or not entry.definition: continue
                
                try:
                    root_txt = entry.root or entry.word[:3]
                    root_rid = RecordID("root", root_txt)
                    word_rid = RecordID("word", entry.word)
                    
                    db.query("UPSERT $id SET arabic_root = $r, identifier = $r", {"id": root_rid, "r": root_txt})
                    db.query("UPSERT $id SET text = $w, simple_text = $w, root = $rid", {"id": word_rid, "w": entry.word, "rid": root_rid})
                    
                    # Embedding call
                    emb_payload = {"model": OLLAMA_EMBED_MODEL, "prompt": entry.definition}
                    emb_res = requests.post(f"{OLLAMA_URL}/api/embeddings", json=emb_payload, timeout=90)
                    emb_res.raise_for_status()
                    embedding = emb_res.json()["embedding"]
                    
                    if not embedding: continue
                    
                    sent_uid = re.sub(r'[^\w]', '', entry.word)[:15] + "_" + str(hash(entry.definition) % 100000)
                    sent_rid = RecordID("sentence", f"dict_{sent_uid}")
                    
                    db.query("""
                        UPSERT $id SET 
                            text = $txt, parent = $pr, source = $src, chunk_index = $idx, 
                            embedding = $emb,
                            transliterations = {en: "", ru: "", tr: ""};
                        RELATE $id->defines->$wid;
                    """, {
                        "id": sent_rid, "txt": entry.definition, "pr": page_rid, 
                        "src": source_rid, "idx": chunk_idx, "emb": embedding, "wid": word_rid
                    })
                    
                    for ent in entry.entities:
                        if not ent.name or ent.name == "N/A": continue
                        
                        wiki = {"url": "", "summary": ""}
                        w_url = "https://ar.wikipedia.org/api/rest_v1/page/summary/" + requests.utils.quote(ent.name)
                        try:
                            w_res = requests.get(w_url, timeout=10)
                            if w_res.status_code == 200:
                                w_data = w_res.json()
                                wiki = {
                                    "url": w_data.get("content_urls", {}).get("desktop", {}).get("page", ""),
                                    "summary": w_data.get("extract", "")
                                }
                        except: pass

                        e_type = ent.type if ent.type in ALLOWED_TYPES else "Concept"
                        e_id = re.sub(r'[^\w]', '_', ent.name)
                        ent_rid = RecordID("entity", e_id)
                        
                        db.query("""
                            UPSERT $id SET name = $n, type = $t, wikipedia_url = $url, summary = $s;
                            RELATE $sid->mentions->$id;
                        """, {
                            "id": ent_rid, "n": ent.name, "t": e_type, 
                            "url": wiki["url"], "s": wiki["summary"], "sid": sent_rid
                        })
                except Exception as e:
                    logger.error(f"Save Error [{entry.word}]: {e}")
    except Exception as e:
        logger.error(f"Task DB Connection Error: {e}")

@flow(name="Batch Dictionary Extraction", task_runner=ThreadPoolTaskRunner(max_workers=20))
def dictionary_batch_flow(limit_pages_per_book: Optional[int] = None):
    logger = get_run_logger()

    target_sources = [
        "source:`shamela_القاموس_المحيط__الفيروزآبادي__ط_الرسالة__ط8_غيرملو_محمد_بن_يعقوب_الفيروز_آبادي_مج`",
        "source:`shamela_المفردات_في_غريب_القرآن__الأصفهاني__ط_القلم_الراغب_الأصفهاني`",
        "source:`shamela_الصحاح_تاج_اللغة_وصحاح_العربية__الجوهري__ط_دار_الع_إسماعيل_بن_حماد_الجوهري_أبو_نص`",
        "source:`shamela_أساس_البلاغة__الزمخشري__ت_عيون_السود__ط_العلمية_12_محمود_بن_عمر_بن_أحمد_الزمخشري_`",
        "source:`shamela_لسان_العرب__ابن_منظور__ط_دار_صادر_115_محمد_بن_مكرم_بن_منظور_الافريقي`",
        "source:`shamela_معجم_مقاييس_اللغة__ابن_فارس__ت_هارون__ط_الفكر_16_أحمد_بن_فارس_بن_زكريا_أبو_الحس`"
    ]

    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        logger.info(f"Connected to SurrealDB for Dictionary Extraction using {OLLAMA_MODEL}")

        for source_id in target_sources:
            logger.info(f">>> Processing: {source_id}")
            start = 0
            batch_size = 50
            processed_count = 0            
            while True:
                q = f"SELECT id, content FROM book_page WHERE source = {source_id} AND processed_for_kg = false LIMIT {batch_size}"
                res = db.query(q)
                pages = res if isinstance(res, list) and (not res or isinstance(res[0], dict)) else (res[0] if res and isinstance(res[0], list) else [])
                
                if not pages: 
                    logger.info(f"Done with {source_id}")
                    break
                    
                logger.info(f"  Batch {start}: submitting {len(pages)} pending pages.")
                
                futures = []
                for page in pages:
                    # RECURSIVE CHUNKER
                    chunks = recursive_arabic_chunker(page["content"], max_words=350)
                    for idx, chunk in enumerate(chunks):
                        futures.append(process_and_save_chunk_task.submit(chunk, str(page["id"]), source_id, idx))
                
                # Wait for batch completion
                for future in futures:
                    future.result()
                
                # Mark pages as processed
                for page in pages:
                    p_id = str(page["id"]).replace("`", "")
                    if ":" in p_id:
                        parts = p_id.split(":", 1)
                        p_rid = RecordID(parts[0], parts[1])
                    else:
                        p_rid = p_id
                    db.query("UPDATE $id SET processed_for_kg = true", {"id": p_rid})
                    processed_count += 1
                
                start += batch_size
                if limit_pages_per_book and processed_count >= limit_pages_per_book:
                    break

if __name__ == "__main__":
    dictionary_batch_flow()
