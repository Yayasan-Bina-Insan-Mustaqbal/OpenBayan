import os

FLOWS_DIR = "/home/abuhafi/Project/IslamResearch/OpenBayan/OpenBayanBackend/notebooks/flows"

def convert_quran():
    with open(f"{FLOWS_DIR}/atomize_quran_v2.py", "r") as f:
        content = f.read()
        
    content = content.replace("embedding = get_embedding(clean_segment)", "")
    content = content.replace("""        if not embedding:
            continue""", "")
    content = content.replace("embedding = {json.dumps(embedding)},", "embedding = NONE,")
    
    with open(f"{FLOWS_DIR}/atomize_quran_fast.py", "w") as f:
        f.write(content)

def convert_murad():
    with open(f"{FLOWS_DIR}/dictionary/ingest_murad.py", "r") as f:
        content = f.read()
        
    content = content.replace("embedding = get_embedding.fn(def_txt)", "")
    content = content.replace("""                if not embedding: continue""", "")
    content = content.replace("emb\": embedding", "emb\": \"NONE\"").replace("embedding = $emb", "embedding = NONE")
    
    with open(f"{FLOWS_DIR}/dictionary/ingest_murad_fast.py", "w") as f:
        f.write(content)

if __name__ == "__main__":
    convert_quran()
    convert_murad()
    print("Created atomize_quran_fast.py and ingest_murad_fast.py")
