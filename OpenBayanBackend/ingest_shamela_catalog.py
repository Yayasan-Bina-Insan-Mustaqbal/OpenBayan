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
SURREAL_URL = os.getenv("SURREAL_URL", "http://192.168.100.33:8000/sql")
SURREAL_AUTH = (os.getenv("SURREAL_USER", "root"), os.getenv("SURREAL_PASS", "RwAbXjBc2z36z"))
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
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

@task
def ingest_book_metadata(row, root_source_id):
    logger = get_run_logger()
    title = row.get("title") or row.get("book_name")
    author = row.get("author")
    category = row.get("category") or row.get("cat")
    
    if not title:
        return
    
    # Create a unique identifier for the book
    # Slugify title and author
    safe_title = re.sub(r'[^\w\s]', '', title).replace(' ', '_').lower()[:50]
    safe_author = re.sub(r'[^\w\s]', '', author).replace(' ', '_').lower()[:30] if author else "unknown"
    identifier = f"shamela_{safe_title}_{safe_author}"
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

@flow(name="Shamela Catalog Ingestion")
def shamela_catalog_ingestion_flow(
    dataset_name: str = "ieasybooks-org/shamela-waqfeya-library",
    limit: Optional[int] = None
):
    logger = get_run_logger()
    logger.info(f"Starting Shamela Catalog Ingestion from {dataset_name}")
    
    root_source = ensure_shamela_source()
    
    dataset = load_dataset(dataset_name, split="index", streaming=True)
    
    count = 0
    for row in dataset:
        ingest_book_metadata(row, root_source)
        count += 1
        if count % 100 == 0:
            logger.info(f"Ingested {count} books...")
        if limit and count >= limit:
            break
            
    logger.info(f"Completed ingestion of {count} book metadata records.")

if __name__ == "__main__":
    shamela_catalog_ingestion_flow()
