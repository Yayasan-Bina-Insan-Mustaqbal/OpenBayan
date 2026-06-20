import os

FLOWS_DIR = "/home/abuhafi/Project/IslamResearch/OpenBayan/OpenBayanBackend/notebooks/flows"

def convert_hadith():
    with open(f"{FLOWS_DIR}/atomize_hadith_v5.py", "r") as f:
        content = f.read()
    
    # Remove embedding call
    content = content.replace("embeddings = get_embeddings_bulk(texts_to_embed)", "embeddings = [None] * len(texts_to_embed)")
    content = content.replace("""        if len(embeddings) != len(texts_to_embed):
            logger.error(f"Mismatch in embeddings. Expected {len(texts_to_embed)}, got {len(embeddings)}. Skipping batch.")
            continue""", "")
            
    # Replace embedding loop check
    content = content.replace("if not emb: continue", "")
    content = content.replace("embedding = {json.dumps(emb)},", "embedding = NONE,")
    
    with open(f"{FLOWS_DIR}/atomize_hadith_fast.py", "w") as f:
        f.write(content)

def convert_kitab():
    with open(f"{FLOWS_DIR}/atomize_kitab.py", "r") as f:
        content = f.read()
        
    content = content.replace("embedding = get_embedding(clean_segment)", "")
    content = content.replace("""        if not embedding:
            continue""", "")
    content = content.replace("embedding = {json.dumps(embedding)},", "embedding = NONE,")
    
    with open(f"{FLOWS_DIR}/atomize_kitab_fast.py", "w") as f:
        f.write(content)

def convert_tafsir():
    with open(f"{FLOWS_DIR}/atomize_tafsir.py", "r") as f:
        content = f.read()
        
    content = content.replace("embedding = get_embedding(clean_segment)", "")
    content = content.replace("""        if not embedding:
            continue""", "")
    content = content.replace("embedding = {json.dumps(embedding)},", "embedding = NONE,")
    
    with open(f"{FLOWS_DIR}/atomize_tafsir_fast.py", "w") as f:
        f.write(content)

def create_launcher():
    launcher_content = """#!/bin/bash
FLOW_DIR="/app/notebooks/flows"
LOG_DIR="/app/notebooks/flows/logs"
mkdir -p "$LOG_DIR"

echo "==> [$(date '+%Y-%m-%d %H:%M:%S')] Starting FAST CPU-BOUND Atomization..."

echo "[1/3] Starting Hadith FAST atomization..."
nohup python "$FLOW_DIR/atomize_hadith_fast.py" --batch 500 > "$LOG_DIR/hadith_fast.log" 2>&1 &

echo "[2/3] Starting Tafsir FAST atomization..."
for key in "ar_muyassar" "ar_saddi" "id_wajiz" "ar_jalalayn" "ar_baghawi" "id_tahlili" "ar_miqbas" "ar_qurtubi" "ar_waseet"; do
  nohup python "$FLOW_DIR/atomize_tafsir_fast.py" --tafsir "$key" --batch 100 > "$LOG_DIR/tafsir_fast_${key}.log" 2>&1 &
done

echo "[3/3] Starting Kitab FAST atomization..."
nohup python "$FLOW_DIR/atomize_kitab_fast.py" --batch 100 > "$LOG_DIR/kitab_fast.log" 2>&1 &

echo "==> All FAST atomization processes launched!"
"""
    with open(f"{FLOWS_DIR}/launch_fast_atomize.sh", "w") as f:
        f.write(launcher_content)

if __name__ == "__main__":
    convert_hadith()
    convert_kitab()
    convert_tafsir()
    create_launcher()
    print("Successfully created fast atomization scripts and launcher!")
