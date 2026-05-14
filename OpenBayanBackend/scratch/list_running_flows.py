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

def list_running_flows():
    filter_url = f"{PREFECT_API_URL}/flow_runs/filter"
    # Filter for RUNNING state
    filter_data = {
        "flow_runs": {
            "state": {
                "type": {"any_": ["RUNNING"]}
            }
        },
        "limit": 100
    }
    
    try:
        runs = get_json(filter_url, filter_data)
        
        if not runs:
            print("No flows are currently running.")
            return

        print(f"{'Flow Name':<40} | {'Run Name':<30} | {'Start Time':<25}")
        print("-" * 100)
        
        for run in runs:
            # Get flow name from flow_id
            flow_name = "Unknown"
            try:
                flow_url = f"{PREFECT_API_URL}/flows/{run['flow_id']}"
                flow_res = get_json(flow_url)
                flow_name = flow_res.get("name", "Unknown")
            except:
                pass
            
            run_name = run.get("name", "Unknown")
            start_time = run.get("start_time", "N/A")
            
            print(f"{flow_name:<40} | {run_name:<30} | {start_time:<25}")
            
    except Exception as e:
        print(f"Error connecting to Prefect API: {e}")

if __name__ == "__main__":
    list_running_flows()
