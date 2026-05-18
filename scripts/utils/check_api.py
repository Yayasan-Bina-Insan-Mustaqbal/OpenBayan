import requests
import socket
import json

def check_api():
    host = "api.alquran.cloud"
    url = f"https://{host}/v1/meta"
    
    print(f"--- Diagnostic Report for {host} ---")
    
    # 1. DNS Check
    try:
        ip = socket.gethostbyname(host)
        print(f"[SUCCESS] DNS Resolution: {host} -> {ip}")
    except Exception as e:
        print(f"[FAILED] DNS Resolution: {e}")
        return

    # 2. Connection Check
    try:
        response = requests.get(url, timeout=10)
        print(f"[SUCCESS] HTTP Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            surah_count = data.get('data', {}).get('surahs', {}).get('count', 'unknown')
            print(f"[SUCCESS] Data retrieved: {surah_count} surahs reported by API.")
        else:
            print(f"[WARNING] API returned unexpected status.")
            
    except requests.exceptions.RequestException as e:
        print(f"[FAILED] HTTP Request: {e}")

if __name__ == "__main__":
    check_api()
