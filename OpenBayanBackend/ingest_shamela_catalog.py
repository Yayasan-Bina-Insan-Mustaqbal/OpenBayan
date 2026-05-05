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
SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000")
if not SURREAL_URL.endswith("/rpc"):
    SURREAL_URL = f"{SURREAL_URL.replace('http', 'ws')}/rpc"

SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "OpenBayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "OpenBayan")

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
def ingest_book_metadata(row):
    logger = get_run_logger()
    title = row.get("title") or row.get("book_name")
    author = row.get("author")
    category = row.get("category") or row.get("cat")
    
    if not title:
        return
    
    # Create a unique identifier
    safe_title = re.sub(r'[^\w\s]', '', title).replace(' ', '_').lower()[:50]
    safe_author = re.sub(r'[^\w\s]', '', author).replace(' ', '_').lower()[:30] if author else "unknown"
    identifier = f"shamela_{safe_title}_{safe_author}"
    source_id = f"source:`{identifier}`"
    
    # Parse paths
    pdf_paths = safe_eval(row.get("pdf_paths"))
    txt_paths = safe_eval(row.get("txt_paths"))
    docx_paths = safe_eval(row.get("docx_paths"))
    
    # Determine type based on category
    type_map = {
        "التفاسير": "book",
        "كتب اللغة": "lexicon",
        "الغريب والمعاجم ولغة الفقه": "lexicon",
        "النحو والصرف": "book",
        "العقيدة": "book",
        "السيرة والشمائل": "book"
    }
    source_type = type_map.get(category, "book")
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        query = """
        UPSERT type::record($id) SET
            identifier = $identifier,
            title = $title,
            author = $author,
            type = $type,
            metadata = {
                category: $category,
                pages: $pages,
                volumes: $volumes
            },
            file_paths = {
                pdf: $pdf,
                txt: $txt,
                docx: $docx
            };
        """
        params = {
            "id": source_id,
            "identifier": identifier,
            "title": title,
            "author": author,
            "type": source_type,
            "category": category,
            "pages": int(row.get("pages")) if row.get("pages") and str(row.get("pages")).isdigit() else 0,
            "volumes": int(row.get("volumes")) if row.get("volumes") and str(row.get("volumes")).isdigit() else 0,
            "pdf": pdf_paths,
            "txt": txt_paths,
            "docx": docx_paths
        }
        
        try:
            db.query(query, params)
        except Exception as e:
            logger.error(f"Failed to ingest {title}: {e}")

@flow(name="Shamela Catalog Ingestion")
def shamela_catalog_ingestion_flow(
    dataset_name: str = "ieasybooks-org/shamela-waqfeya-library",
    limit: Optional[int] = None
):
    logger = get_run_logger()
    logger.info(f"Starting Shamela Catalog Ingestion from {dataset_name}")
    
    dataset = load_dataset(dataset_name, split="index", streaming=True)
    
    count = 0
    for row in dataset:
        ingest_book_metadata(row)
        count += 1
        if count % 100 == 0:
            logger.info(f"Ingested {count} books...")
        if limit and count >= limit:
            break
            
    logger.info(f"Completed ingestion of {count} book metadata records.")

if __name__ == "__main__":
    # Ingest ALL metadata (it's around 8k-10k records, safe for metadata only)
    shamela_catalog_ingestion_flow()
