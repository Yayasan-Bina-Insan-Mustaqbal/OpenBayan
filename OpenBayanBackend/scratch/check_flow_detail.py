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

def check_specific_flow(flow_name):
    # Find flow id
    flows_url = f"{PREFECT_API_URL}/flows/filter"
    try:
        flows = get_json(flows_url, {"flows": {"name": {"any_": [flow_name]}}})
        if not flows:
            print(f"Flow '{flow_name}' not found.")
            return
        
        flow_id = flows[0]["id"]
        print(f"Found Flow: {flow_name} (ID: {flow_id})")
        
        # Get runs for this flow
        runs_url = f"{PREFECT_API_URL}/flow_runs/filter"
        runs = get_json(runs_url, {
            "flow_runs": {"flow_id": {"any_": [flow_id]}},
            "limit": 5,
            "sort": "START_TIME_DESC"
        })
        
        print(f"{'Run Name':<40} | {'Status':<15} | {'Start Time':<25}")
        print("-" * 85)
        for run in runs:
            status = run.get("state_name", "Unknown")
            start_time = run.get("start_time", "N/A")
            name = run.get("name", "Unknown")
            print(f"{name:<40} | {status:<15} | {start_time:<25}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_specific_flow("Ingest Ronnie Aban Quran Metadata")
