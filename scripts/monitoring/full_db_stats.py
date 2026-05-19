import requests
import json
import os
import time

# Connection Details
SURREAL_URL = "http://192.168.100.33:8000/sql"
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
        res = requests.post(SURREAL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=query.encode('utf-8'))
        if res.status_code == 200:
            data = res.json()
            if data and data[0]['result']:
                return data[0]['result'][0].get('count', 0)
    except:
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
    
    # 1. Gather counts
    total_book_pages = get_count("book_page")
    athar_count = get_count("book_page", "id >= book_page:athar_ AND id < book_page:athar_z")
    shamela_count = total_book_pages - athar_count
    
    counts = {
        "hadith": get_count("hadith"),
        "athar": athar_count,
        "shamela": shamela_count,
        "quran": get_count("ayah"),
        "sentences": get_count("sentence"),
        "entities": get_count("entity")
    }
    
    HADITH_TOTAL = 650000 
    ATHAR_TOTAL = 2000000 # Estimated total passages
    SHAMELA_TOTAL = 83915 # The "Previous" dataset seems to be these major kitabs
    
    totals = {
        "hadith": HADITH_TOTAL,
        "athar": ATHAR_TOTAL,
        "shamela": SHAMELA_TOTAL
    }
    
    # 2. Load previous state for speed calc
    prev_state = {}
    if os.path.exists(STATE_FILE):
        try:
            with open(STATE_FILE, 'r') as f:
                prev_state = json.load(f)
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

    # 3. Save current state
    new_state = {}
    for key, count in counts.items():
        new_state[key] = {"count": count, "time": current_time}
    
    with open(STATE_FILE, 'w') as f:
        json.dump(new_state, f)
    
    print("-" * 75)
    print(f"Update: {time.strftime('%Y-%m-%d %H:%M:%S')}")
