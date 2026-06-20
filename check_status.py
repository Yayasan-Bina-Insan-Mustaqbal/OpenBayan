import urllib.request
import time
import json
import os
import base64
import subprocess

URL = "https://openbayan.insanmustaqbal.or.id"
PREFECT_API = "http://100.64.8.38:4200/api/health"
SURREAL_URL = "http://100.64.8.38:8000/sql"
SURREAL_AUTH = ("root", "RwAbXjBc2z36z")
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
    "Accept": "application/json",
    "Content-Type": "text/plain"
}

TABLES = [
    "ayah", "hadith", "category", "topic", "classified_as", 
    "entity_relation", "book_page", "entity", "sentence", 
    "word", "root", "source", "bahs", "alamah"
]

STATUS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "previous_status.json")

def load_previous_status():
    if os.path.exists(STATUS_FILE):
        try:
            with open(STATUS_FILE, "r") as f:
                return json.load(f)
        except:
            pass
    return {}

PREVIOUS_DATA = load_previous_status()
NEW_DATA = {"time_str": time.strftime('%Y-%m-%d %H:%M:%S'), "urls": {}, "tables": {}}

def save_current_status():
    try:
        with open(STATUS_FILE, "w") as f:
            json.dump(NEW_DATA, f, indent=2)
    except:
        pass


def check_url(name, url):
    print(f"Checking {name:16}: {url}...", end=" ", flush=True)
    prev = PREVIOUS_DATA.get("urls", {}).get(name, "Unknown")
    prev_str = f" [Prev: {prev}]" if prev != "Unknown" else ""
    try:
        start = time.time()
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            elapsed = time.time() - start
            if status == 200:
                print(f"\033[1;32mUP\033[0m ({elapsed:.2f}s)\033[0;90m{prev_str}\033[0m")
                NEW_DATA["urls"][name] = "UP"
                return True
            else:
                print(f"\033[1;33mWARN\033[0m (Status: {status})\033[0;90m{prev_str}\033[0m")
                NEW_DATA["urls"][name] = "WARN"
    except Exception as e:
        print(f"\033[1;31mDOWN\033[0m (Error: {e})\033[0;90m{prev_str}\033[0m")
        NEW_DATA["urls"][name] = "DOWN"
    return False

def _run_surreal_query_remote(query):
    auth_str = f"{SURREAL_AUTH[0]}:{SURREAL_AUTH[1]}"
    cmd_str = f"curl -s -X POST -H 'Accept: application/json' -H 'surreal-ns: openbayan' -H 'surreal-db: openbayan' -u '{auth_str}' -d '{query}' http://192.168.100.33:8000/sql"
    
    askpass_path = "/tmp/askpass.sh"
    if not os.path.exists(askpass_path):
        try:
            with open(askpass_path, 'w') as f:
                f.write('#!/bin/bash\necho "cemara153"\n')
            os.chmod(askpass_path, 0o755)
        except Exception:
            pass

    env = os.environ.copy()
    env['SSH_ASKPASS'] = askpass_path
    env['SSH_ASKPASS_REQUIRE'] = 'force'
    env['DISPLAY'] = ':99'

    ssh_cmd = [
        'setsid', 'ssh', '-o', 'StrictHostKeyChecking=no', 
        'root@100.64.8.38', cmd_str
    ]
    res = subprocess.run(ssh_cmd, env=env, capture_output=True, text=True, timeout=180)
    if res.returncode == 0:
        return json.loads(res.stdout)
    return None

def check_surreal_db():
    print(f"Checking {'SurrealDB SQL':16}: http://192.168.100.33:8000/sql (via DevServer)...", end=" ", flush=True)
    prev = PREVIOUS_DATA.get("urls", {}).get("SurrealDB SQL", "Unknown")
    prev_str = f" [Prev: {prev}]" if prev != "Unknown" else ""
    query = "SELECT count() FROM sentence GROUP ALL;"
    try:
        start = time.time()
        res_data = _run_surreal_query_remote(query)
        elapsed = time.time() - start
        
        if res_data and isinstance(res_data, list) and len(res_data) > 0 and res_data[0].get('status') == "OK":
            count = 0
            result = res_data[0].get("result", [])
            if result:
                count = result[0].get("count", 0)
            print(f"\033[1;32mUP\033[0m ({elapsed:.2f}s) | Live Chunks: {count:,}\033[0;90m{prev_str}\033[0m")
            NEW_DATA["urls"]["SurrealDB SQL"] = "UP"
            return True
        else:
            print(f"\033[1;33mWARN\033[0m (Unexpected Response)\033[0;90m{prev_str}\033[0m")
            NEW_DATA["urls"]["SurrealDB SQL"] = "WARN"
    except Exception as e:
        print(f"\033[1;31mDOWN/OFFLINE\033[0m (SurrealDB unreachable via DevServer: {e})\033[0;90m{prev_str}\033[0m")
        NEW_DATA["urls"]["SurrealDB SQL"] = "DOWN"
    return False

def check_active_flows():
    print("\n\033[1;34m[ Active Background Ingestion Flows (DevServer) ]\033[0m")
    
    # Write temp askpass script if not exists
    askpass_path = "/tmp/askpass.sh"
    if not os.path.exists(askpass_path):
        try:
            with open(askpass_path, 'w') as f:
                f.write('#!/bin/bash\necho "cemara153"\n')
            os.chmod(askpass_path, 0o755)
        except Exception:
            pass

    env = os.environ.copy()
    env['SSH_ASKPASS'] = askpass_path
    env['SSH_ASKPASS_REQUIRE'] = 'force'
    env['DISPLAY'] = ':99'

    flows_to_check = {
        "atomize_hadith_v5.py": "Hadith Atomizer",
        "atomize_tafsir.py": "Tafsir Atomizer",
        "atomize_quran_v2.py": "Quran Atomizer",
        "atomize_kitab.py": "Kitab Atomizer"
    }

    try:
        # Run ps aux inside bayan_jupyter container on the dev server
        cmd = [
            'setsid', 'ssh', '-o', 'StrictHostKeyChecking=no', 
            'root@100.64.8.38', 'docker exec bayan_jupyter ps aux'
        ]
        res = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=5)
        
        if res.returncode == 0:
            ps_output = res.stdout
            print(f"{'Flow Script':22} | {'Task Description':16} | {'Status'}")
            print("-" * 55)
            for script, desc in flows_to_check.items():
                if script in ps_output:
                    # Find CPU or details if possible (simple status indicator)
                    status_str = "\033[1;32mRUNNING\033[0m"
                else:
                    status_str = "\033[1;90mINACTIVE\033[0m"
                print(f"{script:22} | {desc:16} | {status_str}")
        else:
            print("Could not query devserver processes (SSH Authentication failed or container down).")
    except Exception as e:
        print(f"Devserver connection offline/unreachable: {e}")

def show_surreal_tables():
    print("\n\033[1;34m[ SurrealDB Live Table Sizes & Status ]\033[0m")
    
    prev_time = PREVIOUS_DATA.get("time_str", "Unknown")
    prev_tables = PREVIOUS_DATA.get("tables", {})
    if prev_tables:
        print(f"\033[0;90mPrevious Check: {prev_time}\033[0m")
        
    queries = [f"SELECT count() FROM {table} GROUP ALL;" for table in TABLES]
    batch_query = "\n".join(queries)
    
    print(f"{'Table Name':16} | {'Status':12} | {'Live Record Count':18} | {'Delta (Since Last)'}")
    print("-" * 75)
    
    try:
        results = _run_surreal_query_remote(batch_query)
        if results:
            for idx, table in enumerate(TABLES):
                count = 0
                status = "\033[1;32mACTIVE\033[0m"
                if idx < len(results):
                    if results[idx].get("status") == "OK":
                        result_list = results[idx].get("result", [])
                        if result_list:
                            count = result_list[0].get("count", 0)
                    else:
                        status = "\033[1;33mERROR\033[0m"
                
                prev_count = prev_tables.get(table, None)
                delta_str = ""
                if prev_count is not None:
                    delta = count - prev_count
                    if delta > 0:
                        delta_str = f"\033[1;32m+{delta:,}\033[0m"
                    elif delta < 0:
                        delta_str = f"\033[1;31m{delta:,}\033[0m"
                    else:
                        delta_str = "\033[0;90m0\033[0m"
                
                NEW_DATA["tables"][table] = count
                count_str = f"{count:,}"
                print(f"{table:16} | {status:12} | {count_str:18} | {delta_str}")
            return
    except Exception:
        pass
    
    for table in TABLES:
        print(f"{table:16} | \033[1;31mUNREACHABLE\033[0m | N/A")

def show_chunking_progress():
    print("\n\033[1;34m[ Live Sentence Chunking Progress by Source ]\033[0m")
    print("\033[0;90mCalculating live source breakdown (this may take ~45 seconds)...\033[0m")
    
    query = "SELECT source, count() FROM sentence GROUP BY source;"
    try:
        start = time.time()
        results = _run_surreal_query_remote(query)
        elapsed = time.time() - start
        
        if results and isinstance(results, list) and len(results) > 0 and results[0].get('status') == "OK":
            res_list = results[0].get("result", [])
            
            print(f"\033[1;32mDone\033[0m ({elapsed:.1f}s)")
            print(f"{'Source ID':45} | {'Live Chunks / Est. Target':28} | {'Progress'}")
            print("-" * 90)
            
            # Sort by count descending
            res_list = sorted(res_list, key=lambda x: x.get("count", 0), reverse=True)
            
            total_chunks = 0
            for item in res_list:
                t = item.get("source", "unknown")
                c = item.get("count", 0)
                total_chunks += c
                
                # Cleanup the source string
                t_clean = t.replace("source:", "").replace("`", "")
                t_display = t_clean[:42] + "..." if len(t_clean) > 45 else t_clean
                
                target = None
                if "quran_uthmani" in t_clean:
                    target = 6236
                elif "tafsir_" in t_clean:
                    target = 6236
                elif "hadith_" in t_clean:
                    target = 739676
                elif "athar_" in t_clean:
                    target = 6735250
                
                if target:
                    prog = (c / target) * 100
                    prog_str = f"{prog:.2f}%"
                    if prog >= 100:
                        prog_str = f"\033[1;32m{prog_str}\033[0m"
                    elif prog > 0:
                        prog_str = f"\033[1;33m{prog_str}\033[0m"
                    else:
                        prog_str = f"\033[1;31m{prog_str}\033[0m"
                    
                    count_str = f"{c:,} / ~{target:,}"
                else:
                    count_str = f"{c:,}"
                    prog_str = "N/A"
                    
                print(f"{t_display:45} | {count_str:28} | {prog_str}")
                
            print("-" * 90)
            print(f"{'TOTAL':45} | {total_chunks:,} chunks embedded")
            print("\n\033[0;90m* Note: Due to synchronous processing, ingestion flows are bottlenecked.")
            print("* Please refer to INGESTION_BOTTLENECK_ANALYSIS.md for details.\033[0m")
        else:
            print("\033[1;31mFailed to parse live progress.\033[0m")
    except Exception as e:
        print(f"\033[1;31mError fetching live progress: {e}\033[0m")

if __name__ == "__main__":
    print("\033[1;34m[ OpenBayan Service Health Status ]\033[0m")
    check_url("Production Web", URL)
    check_url("Prefect API", PREFECT_API)
    check_surreal_db()
    check_active_flows()
    show_surreal_tables()
    show_chunking_progress()
    save_current_status()
