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

def set_flow_run_state(run_id, state_type, state_name):
    url = f"{PREFECT_API_URL}/flow_runs/{run_id}/set_state"
    data = {
        "state": {
            "type": state_type,
            "name": state_name,
            "message": "Cancelled by AI Assistant to cleanup zombie runs."
        }
    }
    try:
        res = get_json(url, data)
        return res.get("status") == "ACCEPT"
    except Exception as e:
        print(f"Error setting state for {run_id}: {e}")
        return False

def cleanup_zombies():
    filter_url = f"{PREFECT_API_URL}/flow_runs/filter"
    filter_data = {
        "flow_runs": {
            "state": {
                "type": {"any_": ["RUNNING"]}
            }
        }
    }
    
    try:
        runs = get_json(filter_url, filter_data)
        
        # Threshold: We consider anything started before May 14th 20:00Z as a zombie
        # (The active one started at 22:50Z)
        threshold = "2026-05-14T20:00:00"
        
        for run in runs:
            start_time = run.get("start_time", "")
            run_name = run.get("name", "Unknown")
            run_id = run.get("id")
            
            if start_time < threshold:
                print(f"Stopping Zombie Run: {run_name} (ID: {run_id}, Started: {start_time})")
                if set_flow_run_state(run_id, "CANCELLED", "Cancelled"):
                    print(f"Successfully cancelled {run_name}")
                else:
                    print(f"Failed to cancel {run_name}")
            else:
                print(f"Keeping Active Run: {run_name} (Started: {start_time})")
                
    except Exception as e:
        print(f"Error during cleanup: {e}")

if __name__ == "__main__":
    cleanup_zombies()
