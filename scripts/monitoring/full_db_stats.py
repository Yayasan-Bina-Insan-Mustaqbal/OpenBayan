import requests
import json
import os
import time

# Connection Details (Points to the active Tailscale LXC container at 100.64.8.38!)
SURREAL_URL = "http://100.64.8.38:8000/sql"
SURREAL_AUTH = ("root", "RwAbXjBc2z36z")
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
    "Accept": "application/json"
}

STATE_FILE = "ingestion_state.json"

def get_count(table, condition=None):
    where = f"WHERE {condition}" if condition else ""
    query = f"SELECT count() AS count FROM {table} {where} GROUP ALL"
    try:
        res = requests.post(SURREAL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=query.encode('utf-8'), timeout=15)
        if res.status_code == 200:
            data = res.json()
            if data and data[0]['result']:
                return data[0]['result'][0].get('count', 0)
    except Exception as e:
        pass
    return 0

def format_time(seconds):
    if seconds < 0: return "--"
    if seconds < 60:
        return f"{seconds:.1f}s"
    elif seconds < 3600:
        return f"{seconds/60:.1f}m"
    elif seconds < 86400:
        return f"{seconds/3600:.1f}h"
    else:
        return f"{seconds/86400:.1f}d"

if __name__ == "__main__":
    current_time = time.time()
    
    # 1. Try to fetch counts from system_counters in sub-milliseconds
    counts = {
        "hadith": 0,
        "athar": 0,
        "shamela": 0,
        "quran": 0,
        "sentences": 0,
        "entities": 0
    }
    
    query = "SELECT count, id FROM system_counters;"
    success = False
    try:
        res = requests.post(SURREAL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=query.encode('utf-8'), timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data and data[0]['result']:
                results = data[0]['result']
                for r in results:
                    key = r.get("id", "").split(":")[-1]
                    if key in counts:
                        counts[key] = r.get("count", 0)
                success = True
    except Exception as e:
        print(f"Warning: Failed to fetch from system_counters ({e}). Falling back to manual check.")

    # 2. Fallback to manual range-optimized counts if system_counters is not populated
    if not success or sum(counts.values()) == 0:
        counts["hadith"] = get_count("hadith")
        counts["athar"] = get_count("book_page", "id >= book_page:athar_ AND id < book_page:athar_z")
        counts["shamela"] = get_count("book_page", "id >= book_page:s AND id < book_page:t")
        counts["quran"] = get_count("ayah")
        counts["sentences"] = get_count("sentence")
        counts["entities"] = get_count("entity")
    
    HADITH_TOTAL = 650000 
    ATHAR_TOTAL = 10000000 
    SHAMELA_TOTAL = 83915 
    
    totals = {
        "hadith": HADITH_TOTAL,
        "athar": ATHAR_TOTAL,
        "shamela": SHAMELA_TOTAL
    }
    
    # Load previous state from primary state location for speed calc
    primary_state_path = "openbayan/ingestion_state.json"
    fallback_state_path = "ingestion_state.json"
    
    prev_state = {}
    state_file_loaded = None
    
    for path_to_try in [primary_state_path, fallback_state_path]:
        if os.path.exists(path_to_try):
            try:
                with open(path_to_try, 'r') as f:
                    prev_state = json.load(f)
                state_file_loaded = path_to_try
                break
            except:
                pass
    
    print(f"{'Target':20} | {'Count':10} | {'Progress':10} | {'Speed':12} | {'ETA':10}")
    print("-" * 75)
    
    for key, count in counts.items():
        total = totals.get(key)
        prog_str = "N/A"
        speed_str = "--"
        eta_str = "--"
        
        if total:
            prog = (count / total) * 100
            prog_str = f"{prog:.2f}%"
            
            if prev_state and key in prev_state:
                p_count = prev_state[key]["count"]
                p_time = prev_state[key]["time"]
                duration = current_time - p_time
                
                if duration > 10: # Only calc speed if at least 10s passed
                    diff = count - p_count
                    if diff > 0:
                        speed_per_sec = diff / duration
                        speed_str = f"{speed_per_sec*60:.1f}/m"
                        remaining = (total - count) / speed_per_sec
                        eta_str = format_time(remaining)
                    elif diff == 0:
                        speed_str = "STALLED"
        
        display_name = key.capitalize()
        print(f"{display_name:20} | {count:10} | {prog_str:10} | {speed_str:12} | {eta_str:10}")

    # Save current state to both locations to ensure sync
    new_state = {}
    for key, count in counts.items():
        new_state[key] = {"count": count, "time": current_time}
    
    for path_to_write in [primary_state_path, fallback_state_path]:
        try:
            # Create directory if it doesn't exist (e.g. openbayan/ prefix)
            dir_name = os.path.dirname(path_to_write)
            if dir_name and not os.path.exists(dir_name):
                os.makedirs(dir_name, exist_ok=True)
            with open(path_to_write, 'w') as f:
                json.dump(new_state, f)
        except Exception as e:
            print(f"Warning: Failed to write state to {path_to_write} ({e})")
    
    print("-" * 75)
    print(f"Update: {time.strftime('%Y-%m-%d %H:%M:%S')}")
