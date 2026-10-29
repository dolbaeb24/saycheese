#!/bin/sh
# Final checks on a finished film: black frames, loudness, sampled frames with the safe box, speech of the final mix.
# Usage: sh qa.sh <project> <film.mp4> [t1 t2 ...]
set -e
LIB=${LIB:-$HOME/lemo-opuscar}
HERE=$(cd "$(dirname "$0")" && pwd)
P=$1; F=$2; shift 2
TS=${*:-"2 9 20 25 34 40 50 56 61 65 70 74"}
mkdir -p "$P/check"
echo "== blackdetect (empty = no black frames)"
ffmpeg -v info -i "$F" -vf blackdetect=d=0.3:pix_th=0.04 -an -f null - 2>&1 | grep -i black_start || true
echo "== loudness (target -14 LUFS)"
ffmpeg -i "$F" -af ebur128 -f null - 2>&1 | grep -A1 "Integrated loudness" | tail -1
echo "== frames"
for t in $TS; do ffmpeg -v error -y -ss "$t" -i "$F" -frames:v 1 "$P/check/f_$t.jpg"; done
stamp=$(date +%H%M%S)
"$LIB/.venv/bin/python" "$HERE/safe_sheet.py" "$P/check/sheet_$stamp.jpg" "$P"/check/f_*.jpg
echo "== speech of the final mix"
ffmpeg -v error -y -i "$F" -ac 1 -ar 16000 "$P/check/final.wav"
"$LIB/.venv/bin/python" - "$P/check/final.wav" <<'PY'
import sys, soundfile as sf
from faster_whisper import WhisperModel
a, sr = sf.read(sys.argv[1], dtype="float32")
for s in WhisperModel("small", device="cpu", compute_type="int8").transcribe(a, language="ru", vad_filter=False, beam_size=5)[0]:
    print(f"{s.start:6.2f} {s.text}")
PY
echo "sheet: $P/check/sheet_$stamp.jpg  (look at it; gaps >10 s in the transcript: re-check with reel-voice/scripts/asr_crop.py)"
