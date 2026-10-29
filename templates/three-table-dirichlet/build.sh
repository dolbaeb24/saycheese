#!/bin/sh
set -e
cd "$(dirname "$0")"
LIB=${LIB:-$HOME/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "LIB must point to the lemo-opuscar folder"; exit 1; }
mkdir -p out
node "$LIB/core/render/events.mjs" "$PWD" --size 1080x1920 --out "$PWD/events.json"
node "$LIB/core/render/video.mjs" "$PWD" --fps 30 --size 1080x1920 --workers 3 --out "$PWD/out/video.mp4"
"$LIB/.venv/bin/python" mix.py
sh "$LIB/core/render/mux.sh" out/video.mp4 out/mix.wav out/dirichlet.mp4 30 0
"$LIB/.venv/bin/python" "$LIB/core/render/srt.py" cues.json out/dirichlet.srt
echo "built out/dirichlet.mp4"
