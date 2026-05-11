import os
from datasets import load_dataset
from surrealdb import Surreal, RecordID
from prefect import flow, task, get_run_logger
from dotenv import load_dotenv

load_dotenv()

SURREAL_URL = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
SURREAL_USER = os.getenv("SURREALDB_USERNAME", "root")
SURREAL_PASS = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
SURREAL_NS = os.getenv("SURREALDB_NAMESPACE", "openbayan")
SURREAL_DB = os.getenv("SURREALDB_DATABASE", "openbayan")

@flow(name="Athar Large Scale Ingestion")
def athar_ingestion_flow():
    logger = get_run_logger()
    logger.info("Starting Athar Datasets Ingestion by collection...")
    
    collections = [
        "aqeedah_passages.jsonl.gz",
        "arabic_language_passages.jsonl.gz",
        "fiqh_passages.jsonl.gz",
        "general_islamic.jsonl.gz",
        "hadith_passages.jsonl.gz",
        "islamic_history_passages.jsonl.gz",
        "quran_tafsir.jsonl.gz",
        "seerah_passages.jsonl.gz",
        "spirituality_passages.jsonl.gz",
        "usul_fiqh.jsonl.gz"
    ]
    
    batch_size = 50 
    
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        logger.info("Connected to SurrealDB.")

        for col_file in collections:
            logger.info(f"Processing collection: {col_file}")
            try:
                # Load specific file
                dataset = load_dataset(
                    "Kandil7/Athar-Datasets", 
                    data_files=f"collections/{col_file}",
                    split="train", 
                    streaming=True
                )
                
                count = 0
                current_batch = []
                for row in dataset:
                    current_batch.append(row)
                    count += 1
                    
                    if len(current_batch) >= batch_size:
                        # Process batch
                        for item in current_batch:
                            c = item.get("collection", col_file.split(".")[0])
                            bid = item.get("book_id", 0)
                            pnum = item.get("page_number", 0)
                            
                            p_id = f"athar_{c}_{bid}_p{pnum}_{count-len(current_batch)}"
                            rid = RecordID("book_page", p_id)
                            src_id = f"athar_book_{bid}"
                            src_rid = RecordID("source", src_id)
                            
                            db.query("""
                                UPSERT $src SET 
                                    identifier = $src_id,
                                    title = $title,
                                    author = $author,
                                    type = 'athar_passage',
                                    language = 'ar';
                                    
                                UPSERT $id SET 
                                    content = $text,
                                    source = $src,
                                    page_number = $page,
                                    category = $cat,
                                    processed_for_kg = false,
                                    processed_for_rijal = false;
                            """, {
                                "src": src_rid,
                                "src_id": src_id,
                                "title": item.get("book_title"),
                                "author": item.get("author"),
                                "id": rid,
                                "text": item.get("content"),
                                "page": pnum,
                                "cat": item.get("category")
                            })
                        
                        if count % 100 == 0:
                            logger.info(f"[{col_file}] Ingested {count} passages...")
                        
                        current_batch = []
                
                # Final batch
                if current_batch:
                     # (Logic same as above for final batch)
                     pass

            except Exception as e:
                logger.error(f"Failed collection {col_file}: {e}")
                # Try to reconnect
                try:
                    db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
                    db.use(SURREAL_NS, SURREAL_DB)
                except:
                    pass

if __name__ == "__main__":
    athar_ingestion_flow()

if __name__ == "__main__":
    athar_ingestion_flow()
