import requests
import time
from typing import List

# Configuration
SURREAL_URL = "http://localhost:8000/sql"
HEADERS = {
    "Surreal-NS": "main",
    "Surreal-DB": "main",
    "Accept": "application/json"
}
AUTH = ("root", "root")

def update_metadata_batch():
    """Updates metadata for existing records surah by surah to avoid SurrealDB Memtable issues."""
    print("Starting metadata update for existing Ayah records...")
    
    for surah_num in range(1, 115):
        query = f"UPDATE ayah MERGE {{ data_sources: ['quran-cloud'] }} WHERE surah_number = {surah_num} AND (data_sources IS NONE OR 'quran-cloud' NOT IN data_sources)"
        try:
            res = requests.post(SURREAL_URL, headers=HEADERS, auth=AUTH, data=query)
            res.raise_for_status()
            print(f"  Surah {surah_num:3}: Updated metadata.")
            time.sleep(0.1) # Be gentle
        except Exception as e:
            print(f"  (!) Failed Surah {surah_num}: {e}")

if __name__ == "__main__":
    update_metadata_batch()
