#!/bin/bash
# =============================================================================
# OpenBayan — Master Atomization Launcher v2
# Bismillahir Rahmanir Rahim.
# Strategy:
#   - Hadith: 1 worker, batch=20 (heavy, 739k records)
#   - Tafsir: 3 concurrent tafsir keys at a time (6236 ayahs each × 9 keys)
#   - Kitab:  1 worker, batch=20 (book pages)
# Tafsir keys are processed in 3 waves to avoid saturating Ollama.
# =============================================================================

FLOW_DIR="/app/notebooks/flows"
LOG_DIR="/app/notebooks/flows/logs"
mkdir -p "$LOG_DIR"

echo "==> [$(date '+%Y-%m-%d %H:%M:%S')] Bismillahir Rahmanir Rahim."
echo "    Launching OpenBayan multi-source atomization..."
echo ""

# ---------------------------------------------------------------------------
# 1. Hadith Atomization — 739,676 hadiths (Enterprise v5)
# ---------------------------------------------------------------------------
echo "[1/3] Starting Hadith atomization..."
nohup python "$FLOW_DIR/atomize_hadith_v5.py" --batch 20 \
  > "$LOG_DIR/hadith_atomize.log" 2>&1 &
HADITH_PID=$!
echo "      PID=$HADITH_PID | log: $LOG_DIR/hadith_atomize.log"
sleep 5  # Let it settle before hammering Ollama

# ---------------------------------------------------------------------------
# 2. Tafsir Atomization — 9 keys × 6,236 ayahs
# Wave strategy: 3 concurrently, then next 3, then final 3
# ---------------------------------------------------------------------------
echo ""
echo "[2/3] Starting Tafsir atomization — Wave 1 (ar_muyassar, ar_saddi, id_wajiz)..."
for key in "ar_muyassar" "ar_saddi" "id_wajiz"; do
  sleep 2
  nohup python "$FLOW_DIR/atomize_tafsir.py" --tafsir "$key" --batch 30 \
    > "$LOG_DIR/tafsir_${key}.log" 2>&1 &
  echo "      [tafsir:$key] PID=$! | log: $LOG_DIR/tafsir_${key}.log"
done

# Wave 2 starts after a delay (Wave 1 will mostly be done by then since ayahs are only 6236)
echo ""
echo "      Wave 2 and 3 will auto-start in 120s..."
(
  sleep 120
  echo "[2/3-Wave2] Starting ar_jalalayn, ar_baghawi, id_tahlili..." >> "$LOG_DIR/launcher.log"
  for key in "ar_jalalayn" "ar_baghawi" "id_tahlili"; do
    sleep 2
    nohup python "$FLOW_DIR/atomize_tafsir.py" --tafsir "$key" --batch 30 \
      >> "$LOG_DIR/tafsir_${key}.log" 2>&1 &
    echo "      [tafsir:$key] PID=$!" >> "$LOG_DIR/launcher.log"
  done

  sleep 120
  echo "[2/3-Wave3] Starting ar_miqbas, ar_qurtubi, ar_waseet..." >> "$LOG_DIR/launcher.log"
  for key in "ar_miqbas" "ar_qurtubi" "ar_waseet"; do
    sleep 2
    nohup python "$FLOW_DIR/atomize_tafsir.py" --tafsir "$key" --batch 30 \
      >> "$LOG_DIR/tafsir_${key}.log" 2>&1 &
    echo "      [tafsir:$key] PID=$!" >> "$LOG_DIR/launcher.log"
  done
) &

# ---------------------------------------------------------------------------
# 3. Kitab (Book Pages) Atomization
# ---------------------------------------------------------------------------
echo ""
echo "[3/3] Starting Kitab (book_page) atomization..."
sleep 3
nohup python "$FLOW_DIR/atomize_kitab.py" --batch 20 \
  > "$LOG_DIR/kitab_atomize.log" 2>&1 &
KITAB_PID=$!
echo "      PID=$KITAB_PID | log: $LOG_DIR/kitab_atomize.log"

echo ""
echo "==> Alhamdulillah. Core flows launched."
echo ""
echo "Monitor progress:"
echo "  tail -f $LOG_DIR/hadith_atomize.log"
echo "  tail -f $LOG_DIR/tafsir_ar_saddi.log"
echo "  tail -f $LOG_DIR/kitab_atomize.log"
echo "  cat /app/notebooks/flows/ingestion_state.json | python3 -m json.tool"
