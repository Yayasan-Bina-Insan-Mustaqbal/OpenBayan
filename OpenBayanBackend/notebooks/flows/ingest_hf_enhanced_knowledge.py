import requests
import json
import os
import re
import unicodedata
from typing import List, Dict, Any, Optional
from prefect import flow, task, get_run_logger
from datasets import load_dataset

# Configuration
# Note: Using the IP that worked in my curl tests
SURREAL_URL = "http://192.168.100.33:8000/sql"
SURREAL_AUTH = ("root", "RwAbXjBc2z36z")
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
    "Accept": "application/json"
}

@task(retries=3)
def execute_query(query: str):
    """Execute a SurrealQL query."""
    res = requests.post(
        SURREAL_URL,
        auth=SURREAL_AUTH,
        headers=SURREAL_HEADERS,
        data=query.encode('utf-8')
    )
    if res.status_code != 200:
        # Log error but don't stop the whole flow for one batch
        print(f"SurrealDB Error: {res.text[:500]}")
    return res.json()

@task
def ingest_quran_connections(batch_size: int = 100):
    """
    Ingest ayah-to-ayah connections from ShahamFarooq/quran-bil-quran-connections
    """
    logger = get_run_logger()
    logger.info("Loading quran-bil-quran-connections...")
    
    # Using streaming to save disk space
    ds = load_dataset("ShahamFarooq/quran-bil-quran-connections", split="train", streaming=True)
    
    queries = []
    count = 0
    for row in ds:
        # Dataset structure: 'verse_keys' is a list of keys like ['1:1', '2:2']
        keys = row.get("verse_keys")
        category = row.get("category") or "connection"
        explanation = row.get("explanation") or ""
        
        if not keys or len(keys) < 2:
            continue
            
        source_key = keys[0]
        # Relate the first one to all others in the list
        for target_key in keys[1:]:
            s1, a1 = map(int, source_key.split(":"))
            s2, a2 = map(int, target_key.split(":"))
            
            # Subqueries to get the ayah IDs
            ayah1_sub = f"(SELECT id FROM ayah WHERE surah_number = {s1} AND ayah_number = {a1} LIMIT 1)"
            ayah2_sub = f"(SELECT id FROM ayah WHERE surah_number = {s2} AND ayah_number = {a2} LIMIT 1)"
            
            escaped_expl = explanation.replace("\\", "\\\\").replace("'", "\\'")
            
            # We use entity_relation to connect Ayahs (as entities of the graph)
            queries.append(f"RELATE {ayah1_sub}->entity_relation->{ayah2_sub} SET type = '{category}', description = '{escaped_expl}', source = 'quran_bil_quran_connections';")
        
        if len(queries) >= batch_size:
            execute_query("\n".join(queries))
            queries = []
            count += 1
            if count % 10 == 0:
                logger.info(f"Processed {count} connection groups")
            
    if queries:
        execute_query("\n".join(queries))
        
    logger.info("Finished ingesting quran connections.")

@task
def ingest_hadith_sanadset(batch_size: int = 50):
    """
    Ingest large hadith sanad dataset from freococo/650k_sanadset
    """
    logger = get_run_logger()
    logger.info("Loading 650k_sanadset...")
    
    # Streaming is mandatory for this size
    ds = load_dataset("freococo/650k_sanadset", split="train", streaming=True)
    
    queries = []
    count = 0
    for row in ds:
        # Keys: 'Hadith', 'Book', 'Num_hadith', 'Matn', 'Sanad'
        collection = row.get("Book")
        h_num = row.get("Num_hadith")
        matn = row.get("Matn")
        sanad = row.get("Sanad")
        
        if not all([collection, matn]):
            continue
            
        # Normalize fields
        escaped_matn = str(matn).replace("\\", "\\\\").replace("'", "\\'")
        escaped_sanad = str(sanad).replace("\\", "\\\\").replace("'", "\\'") if sanad else ""
        
        # Use the global source record for this dataset
        source_id = "source:hadith_650k_sanadset"
        
        # Slugify collection name — SurrealDB record IDs must be ASCII-safe
        coll_slug = unicodedata.normalize('NFKD', str(collection))
        coll_slug = coll_slug.encode('ascii', 'ignore').decode('ascii')
        coll_slug = re.sub(r'[^a-z0-9]+', '_', coll_slug.lower()).strip('_') or 'unknown'
        
        q = f"""
        UPSERT hadith:{coll_slug}_{h_num} CONTENT {{
            collection: '{collection}',
            hadith_number: '{h_num}',
            matn_ar: '{escaped_matn}',
            sanad_raw: '{escaped_sanad}',
            source: {source_id},
            raw_dataset_source: '650k_sanadset'
        }};
        """
        queries.append(q)
        
        if len(queries) >= batch_size:
            execute_query("\n".join(queries))
            queries = []
            count += 1
            if count % 100 == 0:
                logger.info(f"Processed {count * batch_size} hadiths")
                
    if queries:
        execute_query("\n".join(queries))
        
    logger.info("Finished ingesting hadith sanadset.")

@flow(name="Ingest Enhanced HF Quran Knowledge V2")
def ingest_hf_knowledge_flow():
    """Main flow to orchestrate ingestion of multiple HF datasets."""
    # 0. Ensure Source Record Exists
    execute_query("""
    UPSERT source:hadith_650k_sanadset CONTENT {
        identifier: 'hadith_650k_sanadset',
        type: 'hadith',
        language: 'ar',
        title: '650k Hadith Sanadset',
        version: '1.0'
    };
    """)
    
    # 1. Quran Connections (Ayah to Ayah)
    # High value for Knowledge Graph connections
    ingest_quran_connections()
    
    # 2. Large Hadith Sanadset
    # High value for Rijal and Isnad analysis
    # Note: This is large, we run it in batches via streaming
    ingest_hadith_sanadset(batch_size=100)

if __name__ == "__main__":
    ingest_hf_knowledge_flow()
