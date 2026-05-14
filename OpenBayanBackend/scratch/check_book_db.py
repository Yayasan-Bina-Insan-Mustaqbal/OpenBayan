import urllib.request
import json
import base64

SURREAL_URL = "http://192.168.100.33:8000/sql"
SURREAL_AUTH = ("root", "RwAbXjBc2z36z")
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
    "Accept": "application/json"
}

def query_surreal(sql):
    req = urllib.request.Request(SURREAL_URL, data=sql.encode('utf-8'))
    auth_str = f"{SURREAL_AUTH[0]}:{SURREAL_AUTH[1]}"
    auth_b64 = base64.b64encode(auth_str.encode('ascii')).decode('ascii')
    req.add_header("Authorization", f"Basic {auth_b64}")
    for k, v in SURREAL_HEADERS.items():
        req.add_header(k, v)
    
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode('utf-8'))

def check_book_stats():
    tables = ["book", "book_page", "source", "author"]
    for table in tables:
        try:
            res = query_surreal(f"SELECT count() FROM {table} GROUP ALL")
            count = 0
            if res and isinstance(res, list) and len(res) > 0:
                if res[0].get("status") == "OK":
                    result = res[0].get("result", [])
                    if result:
                        count = result[0].get("count", 0)
            print(f"{table}: {count}")
        except Exception as e:
            print(f"{table}: Error - {e}")

if __name__ == "__main__":
    check_book_stats()
