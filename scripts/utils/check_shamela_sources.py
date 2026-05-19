from surrealdb import Surreal
import os

SURREAL_URL = "ws://192.168.100.33:8000/rpc"
SURREAL_USER = "root"
SURREAL_PASS = "RwAbXjBc2z36z"
SURREAL_NS = "openbayan"
SURREAL_DB = "openbayan"

def check_sources():
    with Surreal(SURREAL_URL) as db:
        db.signin({"user": SURREAL_USER, "pass": SURREAL_PASS})
        db.use(SURREAL_NS, SURREAL_DB)
        
        print("Grouping book pages by source...")
        res = db.query('SELECT count(), source FROM book_page WHERE id >= book_page:s AND id < book_page:t GROUP BY source')
        
        if not isinstance(res, list):
            print(f"Error: Query returned {type(res)}")
            return

        for r in res:
            src_id = r.get('source')
            if not src_id:
                print("Found page with NO source link!")
                continue
                
            # Check if source record exists
            s_res = db.query('SELECT * FROM type::record($id)', {'id': str(src_id)})
            if not s_res or not isinstance(s_res, list) or len(s_res) == 0:
                print(f"MISSING source record: {src_id}")
            else:
                title = s_res[0].get('title', 'No Title')
                print(f"FOUND source record: {src_id} ({title})")

if __name__ == "__main__":
    check_sources()
