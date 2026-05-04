from prefect import flow, task, get_run_logger
from datasets import load_dataset
import pandas as pd
import os

@task(name="check-dataset-schema")
def check_dataset_schema(dataset_name: str):
    """
    Peeks at the first row of the dataset to identify column names.
    """
    logger = get_run_logger()
    logger.info(f"Checking schema for {dataset_name}...")
    
    dataset = load_dataset(dataset_name, split="train", streaming=True)
    first_row = next(iter(dataset))
    
    columns = list(first_row.keys())
    logger.info(f"Columns found: {columns}")
    return columns

@task(name="filter-hf-books-by-category")
def filter_books_by_category(dataset_name: str, target_category: str, category_column: str = "category", limit: int = None):
    """
    Streams the dataset and filters books by the specified category.
    """
    logger = get_run_logger()
    logger.info(f"Filtering books in category: '{target_category}' using column: '{category_column}'")
    
    dataset = load_dataset(dataset_name, split="train", streaming=True)
    books = []
    
    count = 0
    for row in dataset:
        if row.get(category_column) == target_category:
            books.append(row)
            count += 1
            if limit and count >= limit:
                break
                
    logger.info(f"Found {len(books)} books in the '{target_category}' category.")
    return books

@task(name="save-to-local-parquet")
def save_to_parquet(books: list, output_path: str):
    """
    Saves the filtered books to a local Parquet file for efficient future access.
    """
    logger = get_run_logger()
    if not books:
        logger.warning("No books to save.")
        return None
    
    df = pd.DataFrame(books)
    df.to_parquet(output_path)
    logger.info(f"Saved {len(books)} books to {output_path}")
    return output_path

@flow(name="Shamela HF Ingestion Flow")
def shamela_hf_ingestion_flow(
    dataset_name: str = "ieasybooks-org/shamela-waqfeya-library",
    target_category: str = "التفاسير",
    output_dir: str = "/app/notebooks/data",
    limit: int = 10
):
    """
    Main flow to ingest books from Hugging Face Shamela Library.
    """
    logger = get_run_logger()
    logger.info("Starting Shamela HF Ingestion Flow")
    
    # Ensure output directory exists
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Check schema (optional but helpful)
    columns = check_dataset_schema(dataset_name)
    
    # Determine the correct category column. 
    # Usually it's 'category', but we can check if it's in columns.
    cat_col = "category" if "category" in columns else ( "cat" if "cat" in columns else columns[0] )
    
    # 2. Filter books
    books = filter_books_by_category(dataset_name, target_category, category_column=cat_col, limit=limit)
    
    # 3. Save to Parquet for 'Pro' optimization
    output_path = os.path.join(output_dir, f"shamela_{target_category}.parquet")
    save_to_parquet(books, output_path)
    
    logger.info("Flow completed successfully")
    return books

if __name__ == "__main__":
    # To run locally for testing (ensure requirements are installed)
    shamela_hf_ingestion_flow(limit=5)
