import urllib.request
import time
import json
import os
import base64
import subprocess

URL = "https://openbayan.insanmustaqbal.or.id"
PREFECT_API = "http://100.64.8.38:4200/api/health"
SURREAL_URL = "http://192.168.100.33:8000/sql"
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

def check_url(name, url):
    print(f"Checking {name:16}: {url}...", end=" ", flush=True)
    try:
        start = time.time()
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=5) as response:
            status = response.getcode()
            elapsed = time.time() - start
            if status == 200:
                print(f"\033[1;32mUP\033[0m ({elapsed:.2f}s)")
                return True
            else:
                print(f"\033[1;33mWARN\033[0m (Status: {status})")
    except Exception as e:
        print(f"\033[1;31mDOWN\033[0m (Error: {e})")
    return False

def check_surreal_db():
    print(f"Checking {"SurrealDB SQL":16}: {SURREAL_URL}...", end=" ", flush=True)
    
    auth_str = f"{SURREAL_AUTH[0]}:{SURREAL_AUTH[1]}"
    auth_b64 = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')
    
    query = "SELECT count() FROM sentence GROUP ALL;"
    
    try:
        start = time.time()
        req = urllib.request.Request(
            SURREAL_URL,
            data=query.encode('utf-8'),
            headers={
                **SURREAL_HEADERS,
                "Authorization": f"Basic {auth_b64}"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=3) as response:
            status = response.getcode()
            elapsed = time.time() - start
            if status == 200:
                res_data = json.loads(response.read().decode('utf-8'))
                count = 0
                if res_data and isinstance(res_data, list) and len(res_data) > 0:
                    result = res_data[0].get("result", [])
                    if result:
                        count = result[0].get("count", 0)
                print(f"\033[1;32mUP\033[0m ({elapsed:.2f}s) | Live Chunks: {count:,}")
                return True
            else:
                print(f"\033[1;33mWARN\033[0m (Status: {status})")
    except Exception as e:
        print(f"\033[1;31mDOWN/OFFLINE\033[0m (Direct LAN URL unreachable: {e})")
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
    
    auth_str = f"{SURREAL_AUTH[0]}:{SURREAL_AUTH[1]}"
    auth_b64 = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')
    
    queries = [f"SELECT count() FROM {table} GROUP ALL;" for table in TABLES]
    batch_query = "\n".join(queries)
    
    print(f"{'Table Name':16} | {'Status':12} | {'Live Record Count'}")
    print("-" * 50)
    
    try:
        req = urllib.request.Request(
            SURREAL_URL,
            data=batch_query.encode('utf-8'),
            headers={
                **SURREAL_HEADERS,
                "Authorization": f"Basic {auth_b64}"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            if response.getcode() == 200:
                results = json.loads(response.read().decode('utf-8'))
                for idx, table in enumerate(TABLES):
                    count = 0
                    status = "\033[1;32mACTIVE\033[0m"
                    if idx < len(results):
                        result_list = results[idx].get("result", [])
                        if result_list:
                            count = result_list[0].get("count", 0)
                    print(f"{table:16} | {status:12} | {count:,}")
                return
    except Exception:
        for table in TABLES:
            print(f"{table:16} | \033[1;31mUNREACHABLE\033[0m | N/A")

def show_chunking_progress():
    print("\n\033[1;34m[ Chunking & Ingestion Progress (Local Cache) ]\033[0m")
    state_file = "ingestion_state.json"
    if not os.path.exists(state_file):
        state_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ingestion_state.json")
        
    if os.path.exists(state_file):
        try:
            with open(state_file, 'r') as f:
                data = json.load(f)
            
            print(f"{'Source':12} | {'Count / Target':20} | {'Last Updated'}")
            print("-" * 60)
            
            sources = {
                "quran": ("Quran Verses", 6236),
                "hadith": ("Hadith Texts", 739676),
                "athar": ("Athar Records", 6735250),
                "shamela": ("Book Pages", 83915),
                "sentences": ("Clean Chunks", None),
                "entities": ("KG Entities", None)
            }
            
            for key, (label, target) in sources.items():
                if key in data:
                    item = data[key]
                    count = item.get("count", 0)
                    timestamp = item.get("time", 0)
                    time_str = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp)) if timestamp else "N/A"
                    
                    if target:
                        progress = (count / target) * 100
                        prog_str = f"{count:,} / {target:,} ({progress:.1f}%)"
                    else:
                        prog_str = f"{count:,}"
                        
                    print(f"{label:12} | {prog_str:20} | {time_str}")
        except Exception as e:
            print(f"Error reading progress cache: {e}")
    else:
        print("Progress cache file 'ingestion_state.json' not found.")

if __name__ == "__main__":
    print("\033[1;34m[ OpenBayan Service Health Status ]\033[0m")
    check_url("Production Web", URL)
    check_url("Prefect API", PREFECT_API)
    check_surreal_db()
    check_active_flows()
    show_surreal_tables()
    show_chunking_progress()
