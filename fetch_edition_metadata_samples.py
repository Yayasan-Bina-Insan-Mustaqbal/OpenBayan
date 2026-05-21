import requests
import json

def main():
    print("Bismillah. Checking arabicnumber samples for Muslim...")
    url = "https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-muslim.min.json"
    r = requests.get(url)
    if r.status_code == 200:
        data = r.json()
        hadiths = data.get("hadiths", [])
        with_arabic = [h for h in hadiths if h.get("arabicnumber") is not None]
        print(f"Total with arabicnumber: {len(with_arabic)}")
        for h in with_arabic[:50]:
            print(f"  Seq: {h.get('hadithnumber')}, Ref: {h.get('reference')}, ArabicNumber: {h.get('arabicnumber')}")

if __name__ == "__main__":
    main()
