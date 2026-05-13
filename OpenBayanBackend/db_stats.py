import os
from surrealdb import Surreal
from dotenv import load_dotenv

load_dotenv()

def main():
    with Surreal(os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")) as db:
        db.signin({"user": "root", "pass": "RwAbXjBc2z36z"})
        db.use("openbayan", "openbayan")
        
        tables = ["book_page", "entity", "sentence", "word", "root", "source", "bahs", "alamah"]
        for table in tables:
            try:
                res = db.query(f"SELECT count() FROM {table} GROUP ALL")
                if isinstance(res, list) and len(res) > 0:
                    if isinstance(res[0], list) and len(res[0]) > 0 and 'count' in res[0][0]:
                        count = res[0][0]['count']
                    elif isinstance(res[0], dict) and 'count' in res[0]:
                        count = res[0]['count']
                    else:
                        count = 0
                else:
                    count = 0
                print(f"{table}: {count}")
            except Exception as e:
                print(f"{table}: Error - {e}")

if __name__ == "__main__":
    main()
