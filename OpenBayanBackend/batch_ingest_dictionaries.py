import os
import sys
import subprocess
from dotenv import load_dotenv

# Load target book IDs
target_books = [
    "source:shamela_القاموس_المحيط__الفيروزآبادي__ط_الرسالة__ط8_غيرملو_محمد_بن_يعقوب_الفيروز_آبادي_مج",
    "source:shamela_المفردات_في_غريب_القرآن__الأصفهاني__ط_القلم_الراغب_الأصفهاني",
    "source:shamela_الصحاح_تاج_اللغة_وصحاح_العربية__الجوهري__ط_دار_الع_إسماعيل_بن_حماد_الجوهري_أبو_نص",
    "source:shamela_أساس_البلاغة__الزمخشري__ت_عيون_السود__ط_العلمية_12_محمود_بن_عمر_بن_أحمد_الزمخشري_"
]

def run_ingestion():
    print(f"Starting batch ingestion for {len(target_books)} recommended books...")
    
    for book_id in target_books:
        print(f"\n>>> PROCESSING: {book_id}")
        # Run the ingestion script for each book
        # We use check=True to stop if one fails, but maybe better to continue
        try:
            subprocess.run(["python3", "ingest_shamela_books.py", book_id], check=True)
            print(f"DONE: {book_id}")
        except subprocess.CalledProcessError as e:
            print(f"FAILED: {book_id} with error {e}")

if __name__ == "__main__":
    run_ingestion()
