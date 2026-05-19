import os
import re
import requests
import json
import ast
from typing import Optional
from datasets import load_dataset
from surrealdb import Surreal
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
SURREAL_URL = os.getenv("SURREALDB_URL", "http://192.168.100.33:8000/sql")
if SURREAL_URL.startswith("ws"):
    SURREAL_URL = SURREAL_URL.replace("ws", "http").replace("/rpc", "/sql")
if not SURREAL_URL.endswith("/sql"):
    SURREAL_URL = f"{SURREAL_URL.rstrip('/')}/sql"

SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_AUTH = (SURREAL_USER, SURREAL_PASS)

SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

SURREAL_HEADERS = {
    "surreal-ns": SURREAL_NS,
    "surreal-db": SURREAL_DB,
    "Accept": "application/json"
}

def query_surreal(sql, params=None):
    # Debug: print first few SQLs
    if "SQL_DEBUG_COUNT" not in globals(): globals()["SQL_DEBUG_COUNT"] = 0
    if globals()["SQL_DEBUG_COUNT"] < 5:
        print(f"SQL Debug: {sql[:200]}...")
        globals()["SQL_DEBUG_COUNT"] += 1

    # Standardizing on HTTP for easier batching and portability
    req = requests.post(
        SURREAL_URL,
        auth=SURREAL_AUTH,
        headers=SURREAL_HEADERS,
        data=sql.encode('utf-8')
    )
    if req.status_code != 200:
        logger.error(f"SurrealDB Error {req.status_code}: {req.text}")
        raise Exception(f"SurrealDB Error {req.status_code}: {req.text}")
    
    logger = get_run_logger()
    results = req.json()
    # Check if any of the statements in the batch failed
    if isinstance(results, list):
        for i, res in enumerate(results):
            if res.get("status") != "OK":
                logger.error(f"Statement {i} Error in batch: {res.get('status')}")
                logger.error(f"Result: {res.get('result')}")
                logger.error(f"Full SQL was: {sql}")
    return results

def safe_eval(val):
    if not val:
        return []
    if isinstance(val, list):
        return val
    if isinstance(val, str) and val.startswith("[") and val.endswith("]"):
        try:
            return ast.literal_eval(val)
        except:
            return [val]
    return [val] if isinstance(val, str) else []

@task
def ensure_shamela_source():
    """Ensure the root source for Shamela Waqfeya exists."""
    query = """
    UPSERT source:shamela_waqfeya SET
        identifier = 'shamela_waqfeya',
        title = 'Shamela Waqfeya Library',
        author = 'Various',
        type = 'book',
        language = 'ar';
    """
    query_surreal(query)
    return "source:shamela_waqfeya"

@task(name="Ingest Book Metadata")
def ingest_book_metadata(row, root_source_id):
    logger = get_run_logger()
    title = row.get("title") or row.get("book_name")
    author = row.get("author")
    category = row.get("category") or row.get("cat")
    
    if not title:
        return
    
    import hashlib
    row_str = json.dumps(row, sort_keys=True)
    row_hash = hashlib.md5(row_str.encode()).hexdigest()[:8]
    
    # Create a unique identifier for the book
    safe_title = re.sub(r'[^\w\s]', '', title).replace(' ', '_')[:60]
    safe_author = re.sub(r'[^\w\s]', '', author).replace(' ', '_')[:40] if author else "unknown"
    identifier = f"shamela_{safe_title}_{safe_author}_{row_hash}"
    book_id = f"book:`{identifier}`"
    
    # Parse paths
    pdf_paths = safe_eval(row.get("pdf_paths"))
    txt_paths = safe_eval(row.get("txt_paths"))
    docx_paths = safe_eval(row.get("docx_paths"))
    
    # We also create a specific source record for THIS edition of the book
    source_id = f"source:`{identifier}`"

    pages = int(row.get("pages")) if row.get("pages") and str(row.get("pages")).isdigit() else 0
    volumes = int(row.get("volumes")) if row.get("volumes") and str(row.get("volumes")).isdigit() else 0
    
    sql = f"UPSERT {source_id} SET "
    sql += f"identifier = {json.dumps(identifier)}, "
    sql += f"title = {json.dumps(title)}, "
    sql += f"author = {json.dumps(author)}, "
    sql += f"type = 'book', "
    sql += f"language = 'ar', "
    sql += f"metadata = {json.dumps({'category': category, 'pages': pages, 'volumes': volumes})}, "
    sql += f"file_paths = {json.dumps({'pdf': pdf_paths, 'txt': txt_paths, 'docx': docx_paths})}; "
    
    sql += f"UPSERT {book_id} SET "
    sql += f"title = {json.dumps(title)}, "
    sql += f"author = {json.dumps(author)}, "
    sql += f"category = {json.dumps(category)}, "
    sql += f"source = {source_id}, "
    sql += f"extra_metadata = {json.dumps({'shamela_id': identifier, 'root_source': root_source_id})};"

    logger = get_run_logger()
    try:
        # print(f"Ingesting: {title}")
        query_surreal(sql)
    except Exception as e:
        print(f"CRITICAL ERROR in ingest_book_metadata: {e}")
        logger.error(f"Failed to ingest {title}: {e}")

@task
def get_existing_book_ids():
    logger = get_run_logger()
    try:
        # Standardizing on HTTP for easier batching and portability
        req = requests.post(
            SURREAL_URL,
            auth=SURREAL_AUTH,
            headers=SURREAL_HEADERS,
            data="SELECT id FROM book;".encode('utf-8')
        )
        if req.status_code != 200:
            return set()
        res = req.json()
        existing_ids = set()
        if res and res[0].get("result"):
            for r in res[0]["result"]:
                existing_ids.add(r["id"])
        logger.info(f"Loaded {len(existing_ids)} existing book IDs from database.")
        return existing_ids
    except Exception as e:
        logger.warning(f"Could not load existing book IDs: {e}")
        return set()

def compute_book_id(row):
    title = row.get("title") or row.get("book_name")
    author = row.get("author")
    if not title:
        return None
    import hashlib
    row_str = json.dumps(row, sort_keys=True)
    row_hash = hashlib.md5(row_str.encode()).hexdigest()[:8]
    safe_title = re.sub(r'[^\w\s]', '', title).replace(' ', '_')[:60]
    safe_author = re.sub(r'[^\w\s]', '', author).replace(' ', '_')[:40] if author else "unknown"
    identifier = f"shamela_{safe_title}_{safe_author}_{row_hash}"
    return f"book:`{identifier}`"

@flow(name="Shamela Catalog Ingestion")
def shamela_catalog_ingestion_flow(
    dataset_name: str = "ieasybooks-org/shamela-waqfeya-library",
    limit: Optional[int] = None
):
    logger = get_run_logger()
    logger.info(f"Starting Shamela Catalog Ingestion from {dataset_name}")
    
    root_source = ensure_shamela_source()
    existing_ids = get_existing_book_ids()
    
    dataset = load_dataset(dataset_name, split="index", streaming=True)
    
    count = 0
    new_count = 0
    skipped_count = 0
    
    for row in dataset:
        count += 1
        book_id = compute_book_id(row)
        if book_id and book_id in existing_ids:
            skipped_count += 1
            if skipped_count % 500 == 0:
                logger.info(f"Skipped {skipped_count} existing books...")
            continue
            
        ingest_book_metadata(row, root_source)
        new_count += 1
        if new_count % 100 == 0:
            logger.info(f"Ingested {new_count} new books...")
        if limit and new_count >= limit:
            break
            
    logger.info(f"Completed catalog flow. Total processed in dataset: {count}. Skipped: {skipped_count}. Ingested new: {new_count}.")

if __name__ == "__main__":
    shamela_catalog_ingestion_flow()
