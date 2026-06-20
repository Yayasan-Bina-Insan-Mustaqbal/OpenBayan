#!/bin/bash
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
