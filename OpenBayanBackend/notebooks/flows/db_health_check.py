import os
from prefect import flow, task, get_run_logger
import requests
import json

# Connection Details from docker-compose/env
SURREAL_URL = "http://192.168.100.33:8000/sql"
SURREAL_AUTH = ("root", "RwAbXjBc2z36z")
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
    "Accept": "application/json"
}

@task
def get_table_counts():
    logger = get_run_logger()
    tables = ["book", "source", "book_page", "sentence", "ayah", "hadith"]
    stats = {}
    
    for table in tables:
        query = f"SELECT count() FROM {table} GROUP ALL"
        try:
            res = requests.post(
                SURREAL_URL, 
                auth=SURREAL_AUTH, 
                headers=SURREAL_HEADERS, 
                data=query.encode('utf-8')
            )
            if res.status_code == 200:
                data = res.json()
                count = 0
                if data and isinstance(data, list) and len(data) > 0:
                    result = data[0].get("result", [])
                    if result:
                        count = result[0].get("count", 0)
                stats[table] = count
                logger.info(f"Table {table}: {count}")
            else:
                stats[table] = f"Error {res.status_code}: {res.text[:100]}"
                logger.error(f"Error for {table}: {res.text}")
        except Exception as e:
            stats[table] = f"Exception: {str(e)}"
            logger.error(f"Exception for {table}: {e}")
            
    return stats

@flow(name="Database Health Check")
def db_health_check_flow():
    return get_table_counts()

if __name__ == "__main__":
    db_health_check_flow()
