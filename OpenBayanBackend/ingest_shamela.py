from prefect import flow, task, get_run_logger
from datasets import load_dataset
import pandas as pd
import os
import time

@task(name="check-dataset-schema")
def check_dataset_schema(dataset_name: str):
    logger = get_run_logger()
    logger.info(f"Checking schema for {dataset_name}...")
    dataset = load_dataset(dataset_name, split="index", streaming=True)
    first_row = next(iter(dataset))
    columns = list(first_row.keys())
    logger.info(f"Columns found: {columns}")
    return columns

@task(name="filter-hf-books")
def filter_hf_books(dataset_name: str, target_category: str = None, target_title: str = None, limit: int = None):
    logger = get_run_logger()
    if target_title:
        logger.info(f"Searching for book title: '{target_title}'")
    elif target_category:
        logger.info(f"Filtering books in category: '{target_category}'")
    
    dataset = load_dataset(dataset_name, split="index", streaming=True)
    books = []
    
    count = 0
    for row in dataset:
        # The column names might be 'category', 'cat', 'title', 'book_name', etc.
        # Based on typical Shamela HF datasets, we check common ones.
        row_cat = row.get("category") or row.get("cat")
        row_title = row.get("book_name") or row.get("title")
        
        match = False
        if target_title and row_title and target_title in row_title:
            match = True
        elif target_category and row_cat == target_category:
            match = True
            
        if match:
            books.append(row)
            count += 1
            logger.info(f" Found: {row_title} ({row_cat})")
            if limit and count >= limit:
                break
                
    logger.info(f"Found {len(books)} matches.")
    return books

@task(name="save-to-local-parquet")
def save_to_parquet(books: list, output_path: str):
    logger = get_run_logger()
    if not books:
        logger.warning("No books to save.")
        return None
    
    df = pd.DataFrame(books)
    # Convert any problematic types (like lists/dicts) to string if necessary for Parquet
    for col in df.columns:
        if df[col].apply(lambda x: isinstance(x, (list, dict))).any():
            df[col] = df[col].apply(str)
            
    df.to_parquet(output_path)
    logger.info(f"Saved {len(books)} books to {output_path}")
    return output_path

@flow(name="Shamela Comprehensive Ingestion")
def shamela_ingestion_flow(
    dataset_name: str = "ieasybooks-org/shamela-waqfeya-library",
    output_dir: str = "data/shamela",
    limit_sample: int = 5,
    specific_book: str = "معجم مقاييس اللغة"
):
    logger = get_run_logger()
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Sample Ingestion (Tafsir category)
    logger.info(f"--- Task 1: Sample Ingestion (5 Tafsir books) ---")
    tafsir_books = filter_hf_books(dataset_name, target_category="التفاسير", limit=limit_sample)
    save_to_parquet(tafsir_books, os.path.join(output_dir, "sample_tafsir.parquet"))
    
    # 2. Specific Book Ingestion
    logger.info(f"--- Task 2: Specific Book Ingestion ({specific_book}) ---")
    specific_books = filter_hf_books(dataset_name, target_title=specific_book, limit=1)
    save_to_parquet(specific_books, os.path.join(output_dir, f"specific_{specific_book.replace(' ', '_')}.parquet"))
    
    logger.info("Ingestion flow completed.")

if __name__ == "__main__":
    shamela_ingestion_flow()
