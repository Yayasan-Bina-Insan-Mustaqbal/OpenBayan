import requests
from bs4 import BeautifulSoup
import json
import time
import re
import argparse
from typing import List, Dict, Any, Optional
from prefect import flow, task, get_run_logger

# Configuration
SURREAL_URL = "http://192.168.100.33:8000/sql"
SURREAL_AUTH = ("root", "RwAbXjBc2z36z")
SURREAL_HEADERS = {
    "surreal-ns": "openbayan",
    "surreal-db": "openbayan",
    "Accept": "application/json"
}

BASE_URL = "https://tafsirweb.com"

# Full map of Surahs from TafsirWeb
SURAH_MAP = {
    1: 'surat-al-fatihah', 2: 'surat-al-baqarah', 3: 'surat-ali-imran', 4: 'surat-an-nisa',
    5: 'surat-al-maidah', 6: 'surat-al-anam', 7: 'surat-al-araf', 8: 'surat-al-anfal',
    9: 'surat-at-taubah', 10: 'surat-yunus', 11: 'surat-hud', 12: 'surat-yusuf',
    13: 'surat-ar-rad', 14: 'surat-ibrahim', 15: 'surat-al-hijr', 16: 'surat-an-nahl',
    17: 'surat-al-isra', 18: 'surat-al-kahfi', 19: 'surat-maryam', 20: 'surat-thaha',
    21: 'surat-al-anbiya', 22: 'surat-al-hajj', 23: 'surat-al-muminun', 24: 'surat-an-nur',
    25: 'surat-al-furqon', 26: 'surat-asy-syuara', 27: 'surat-an-naml', 28: 'surat-al-qashash',
    29: 'surat-al-ankabut', 30: 'surat-ar-rum', 31: 'surat-luqman', 32: 'surat-as-sajdah',
    33: 'surat-al-ahzab', 34: 'surat-saba', 35: 'surat-fathir', 36: 'surat-yasin',
    37: 'surat-ash-shaffat', 38: 'surat-shad', 39: 'surat-az-zumar', 40: 'surat-al-mumin',
    41: 'surat-fushshilat', 42: 'surat-asy-syura', 43: 'surat-az-zukhruf', 44: 'surat-ad-dukhan',
    45: 'surat-al-jatsiyah', 46: 'surat-al-ahqaf', 47: 'surat-muhammad', 48: 'surat-al-fath',
    49: 'surat-al-hujurat', 50: 'surat-qaf', 51: 'surat-adz-dzariyat', 52: 'surat-ath-thur',
    53: 'surat-an-najm', 54: 'surat-al-qamar', 55: 'surat-ar-rahman', 56: 'surat-al-waqiah',
    57: 'surat-al-hadid', 58: 'surat-al-mujadalah', 59: 'surat-al-hasyr', 60: 'surat-al-mumtahanah',
    61: 'surat-ash-shaff', 62: 'surat-al-jumuah', 63: 'surat-al-munafiqun', 64: 'surat-at-taghabun',
    65: 'surat-at-thalaq', 66: 'surat-at-tahrim', 67: 'surat-al-mulk', 68: 'surat-al-qalam',
    69: 'surat-al-haqqah', 70: 'surat-al-maarij', 71: 'surat-nuh', 72: 'surat-al-jin',
    73: 'surat-al-muzzammil', 74: 'surat-al-muddatstsir', 75: 'surat-al-qiyamah', 76: 'surat-al-insan',
    77: 'surat-al-mursalat', 78: 'surat-an-naba', 79: 'surat-an-naziat', 80: 'surat-abasa',
    81: 'surat-at-takwir', 82: 'surat-al-infithar', 83: 'surat-al-muthaffifin', 84: 'surat-al-insyiqaq',
    85: 'surat-al-buruj', 86: 'surat-ath-thariq', 87: 'surat-al-ala', 88: 'surat-al-ghasyiyyah',
    89: 'surat-al-fajr', 90: 'surat-al-balad', 91: 'surat-asy-syams', 92: 'surat-al-lail',
    93: 'surat-adh-dhuha', 94: 'surat-al-insyirah', 95: 'surat-at-tin', 96: 'surat-al-alaq',
    97: 'surat-al-qadr', 98: 'surat-al-bayyinah', 99: 'surat-az-zalzalah', 100: 'surat-al-adiyat',
    101: 'surat-al-qariah', 102: 'surat-at-takatsur', 103: 'surat-al-ashr', 104: 'surat-al-humazah',
    105: 'surat-al-fil', 106: 'surat-quraisy', 107: 'surat-al-maun', 108: 'surat-al-kautsar',
    109: 'surat-al-kafirun', 110: 'surat-an-nashr', 111: 'surat-al-lahab', 112: 'surat-al-ikhlas',
    113: 'surat-al-falaq', 114: 'surat-an-naas'
}

def slugify_source(title: str) -> str:
    title = title.lower()
    if "madinah" in title: return "id_madinah"
    if "muyassar" in title: return "id_muyassar"
    if "zubdatut" in title: return "id_zubdatut"
    if "wajiz" in title: return "id_wajiz"
    if "sa'di" in title or "saddi" in title: return "id_saadi"
    if "ibnu katsir" in title: return "id_ibnu_katsir_ringkas"
    if "ash-shaghir" in title: return "id_ash_shaghir"
    clean = re.sub(r'[^a-z0-9\s]', '', title)
    parts = clean.split()
    return "id_" + "_".join(parts[:2])

@task(retries=3, retry_delay_seconds=10)
def get_ayah_links(surah_url: str) -> List[str]:
    res = requests.get(surah_url)
    res.raise_for_status()
    soup = BeautifulSoup(res.text, 'html.parser')
    links = []
    for a in soup.find_all('a', href=True):
        if '/ayat-' in a['href'] or '-ayat-' in a['href']:
            url = a['href']
            if not url.startswith('http'):
                url = BASE_URL + (url if url.startswith('/') else '/' + url)
            links.append(url)
    return sorted(list(set(links)), key=lambda x: int(re.search(r'ayat-(\d+)', x).group(1)) if re.search(r'ayat-(\d+)', x) else 0)

@task(retries=3)
def scrape_tafsir_page(url: str) -> Dict[str, Any]:
    res = requests.get(url)
    res.raise_for_status()
    soup = BeautifulSoup(res.text, 'html.parser')
    ayah_info = {"url": url, "tafsirs": {}}
    sources = soup.find_all(['p', 'h3', 'h4'])
    current_source = None
    current_text = []
    for element in sources:
        text = element.get_text().strip()
        if '📚' in text or (element.name in ['h3', 'h4'] and 'Tafsir' in text):
            if current_source and current_text:
                ayah_info["tafsirs"][slugify_source(current_source)] = "\n\n".join(current_text)
            current_source = text.replace('📚', '').strip()
            current_text = []
        elif current_source:
            if text and not text.startswith('Mau pahala jariyah'):
                current_text.append(text)
    if current_source and current_text:
        ayah_info["tafsirs"][slugify_source(current_source)] = "\n\n".join(current_text)
    return ayah_info

@task(retries=3)
def upsert_to_surreal(surah_num: int, ayah_num: int, data: Dict[str, Any]):
    tafsir_json = json.dumps(data["tafsirs"]).replace("\\", "\\\\").replace("'", "\\'")
    source_meta = {"sources": {"tafsirweb": data["url"]}}
    meta_json = json.dumps(source_meta).replace("\\", "\\\\").replace("'", "\\'")
    query = f"UPDATE ayah SET tafsir = tafsir || {tafsir_json}, metadata = metadata || {meta_json} WHERE surah_number = {surah_num} AND ayah_number = {ayah_num};"
    requests.post(SURREAL_URL, auth=SURREAL_AUTH, headers=SURREAL_HEADERS, data=query.encode('utf-8'))

@flow(name="TafsirWeb Scraper (Modular)")
def tafsirweb_scraper_flow(surah_num: int):
    logger = get_run_logger()
    surah_slug = SURAH_MAP.get(surah_num)
    if not surah_slug:
        logger.error(f"Surah {surah_num} not found in map.")
        return
    surah_url = f"{BASE_URL}/{surah_slug}"
    logger.info(f"Scraping Surah {surah_num}: {surah_url}")
    try:
        links = get_ayah_links(surah_url)
        for link in links:
            a_match = re.search(r'ayat-(\d+)', link)
            a_num = int(a_match.group(1)) if a_match else 0
            logger.info(f"Ayah {a_num}")
            content = scrape_tafsir_page(link)
            upsert_to_surreal(surah_num, a_num, content)
            time.sleep(1)
    except Exception as e:
        logger.error(f"Error: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--surah", type=int, help="Specific Surah number to scrape")
    parser.add_argument("--start", type=int, help="Start Surah number for range")
    parser.add_argument("--end", type=int, help="End Surah number for range")
    args = parser.parse_args()

    if args.surah:
        tafsirweb_scraper_flow(args.surah)
    elif args.start and args.end:
        for s in range(args.start, args.end + 1):
            tafsirweb_scraper_flow(s)
    else:
        print("Usage: python scrape_tafsirweb.py --surah 1 OR --start 1 --end 5")
