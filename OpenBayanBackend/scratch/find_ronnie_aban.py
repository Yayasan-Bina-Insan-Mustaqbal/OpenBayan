import urllib.request
import json

PREFECT_API_URL = "http://100.64.8.38:4200/api"

def get_json(url, data=None):
    req = urllib.request.Request(url)
    if data:
        req.add_header('Content-Type', 'application/json')
        data = json.dumps(data).encode('utf-8')
    
    with urllib.request.urlopen(req, data=data) as response:
        return json.loads(response.read().decode('utf-8'))

def find_ronnie_aban():
    filter_url = f"{PREFECT_API_URL}/flow_runs/filter"
    filter_data = {
        "limit": 50,
        "sort": "START_TIME_DESC"
    }
    
    try:
        runs = get_json(filter_url, filter_data)
        
        print(f"{'Flow Name':<40} | {'Status':<15} | {'Start Time':<25}")
        print("-" * 85)
        
        for run in runs:
            # Get flow name from flow_id
            flow_name = "Unknown"
            try:
                flow_url = f"{PREFECT_API_URL}/flows/{run['flow_id']}"
                flow_res = get_json(flow_url)
                flow_name = flow_res.get("name", "Unknown")
            except:
                pass
            
            if "Ronnie" in flow_name:
                status = run.get("state_name", "Unknown")
                start_time = run.get("start_time", "N/A")
                print(f"{flow_name:<40} | {status:<15} | {start_time:<25}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_ronnie_aban()
