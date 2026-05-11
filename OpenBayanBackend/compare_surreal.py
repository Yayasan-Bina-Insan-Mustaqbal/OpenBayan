import os
import json
from surrealdb import Surreal
from dotenv import load_dotenv

load_dotenv()

def compare():
    local_url = "ws://127.0.0.1:8000/rpc"
    local_user = "root"
    local_pass = "root"
    
    remote_url = os.getenv("SURREALDB_URL", "ws://192.168.100.33:8000/rpc")
    remote_user = os.getenv("SURREALDB_USERNAME", "root")
    remote_pass = os.getenv("SURREALDB_PASSWORD", "RwAbXjBc2z36z")
    remote_ns = os.getenv("SURREALDB_NAMESPACE", "openbayan")
    remote_db = os.getenv("SURREALDB_DATABASE", "openbayan")

    print(f"--- SurrealDB Comparison ---")
    
    def get_first(res):
        if isinstance(res, list) and len(res) > 0:
            return res[0]
        return res

    # Check Local
    try:
        with Surreal(local_url) as db:
            db.signin({"user": local_user, "pass": local_pass})
            root_info = get_first(db.query("INFO FOR ROOT"))
            namespaces = list(root_info.get('namespaces', {}).keys())
            print(f"\n[ LOCAL ] URL: {local_url}")
            for ns in namespaces:
                db.use(ns, None)
                ns_info = get_first(db.query("INFO FOR NAMESPACE"))
                databases = list(ns_info.get('databases', {}).keys())
                for d in databases:
                    db.use(ns, d)
                    db_info = get_first(db.query("INFO FOR DATABASE"))
                    tables = list(db_info.get('tables', {}).keys())
                    print(f" NS: {ns}, DB: {d}")
                    for t in tables:
                        try:
                            count_res = get_first(db.query(f"SELECT count() FROM {t} GROUP ALL"))
                            count = count_res[0].get('count', 0) if count_res else 0
                            print(f"  - {t}: {count}")
                        except:
                            print(f"  - {t}: [error]")
    except Exception as e:
        print(f"Local Check Failed: {e}")

    # Check Remote
    try:
        with Surreal(remote_url) as db:
            db.signin({"user": remote_user, "pass": remote_pass})
            db.use(remote_ns, remote_db)
            print(f"\n[ REMOTE ] URL: {remote_url} (NS: {remote_ns}, DB: {remote_db})")
            db_info = get_first(db.query("INFO FOR DATABASE"))
            tables = list(db_info.get('tables', {}).keys())
            for t in tables:
                try:
                    count_res = get_first(db.query(f"SELECT count() FROM {t} GROUP ALL"))
                    count = count_res[0].get('count', 0) if count_res else 0
                    print(f"  - {t}: {count}")
                except:
                    print(f"  - {t}: [error]")
    except Exception as e:
        print(f"Remote Check Failed: {e}")

if __name__ == "__main__":
    compare()
