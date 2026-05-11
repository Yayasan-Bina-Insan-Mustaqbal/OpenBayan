import subprocess

target_books = [
    "source:shamela_سير_أعلام_النبلاء__الذهبي__ت_الأرناؤوط_وآخرون__ط_ا_محمد_بن_أحمد_بن_عثمان_الذهبي_ش",
    "source:shamela_البداية_والنهاية__ابن_كثير__ت_التركي__ط_دار_هجر_12_عماد_الدين_ابن_كثير",
    "source:shamela_تفسير_القرآن_العظيم__ابن_كثير__ط_دار_طيبة__ط2_18_إسماعيل_بن_عمر_بن_كثير_القرشي_"
]

def run_ingestion():
    print(f"Starting batch ingestion for {len(target_books)} major kitabs...")
    for book_id in target_books:
        print(f"\n>>> PROCESSING: {book_id}")
        try:
            # We must use the backticked version for the shell command
            subprocess.run(["python3", "ingest_shamela_books.py", f"{book_id}"], check=True)
            print(f"DONE: {book_id}")
        except subprocess.CalledProcessError as e:
            print(f"FAILED: {book_id} with error {e}")

if __name__ == "__main__":
    run_ingestion()
