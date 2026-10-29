#!/bin/sh
# Installs everything the reels pipeline needs, except system tools (Node 20+, ffmpeg, Python 3.11-3.13 or uv).
# Usage: sh setup.sh            -> library in ${LIB:-$HOME/lemo-opuscar}
set -e
LIB=${LIB:-$HOME/lemo-opuscar}
miss=""
command -v node >/dev/null || miss="$miss node(20+)"
command -v ffmpeg >/dev/null || miss="$miss ffmpeg"
command -v git >/dev/null || miss="$miss git"
command -v python3 >/dev/null || command -v uv >/dev/null || miss="$miss python3.11+(or uv)"
[ -z "$miss" ] || { echo "MISSING system tools:$miss"; exit 1; }
node -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)' || { echo "Node 20+ needed"; exit 1; }

if [ -d "$LIB/.git" ]; then git -C "$LIB" pull --ff-only --quiet || echo "! could not update $LIB, using it as is"
else git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar.git "$LIB"; fi

cd "$LIB"
# core tier: npm (playwright-core, three), headless Chromium, .venv with numpy/scipy/soundfile/soxr/pillow
sh plugin/skills/lemo-opuscar/scripts/setup.sh deps
# speech check: faster-whisper only (the library's voice tier also pulls Kokoro, which has no Russian)
if command -v uv >/dev/null; then uv pip install --quiet --python .venv/bin/python faster-whisper "av<19"
else .venv/bin/python -m pip install --quiet --disable-pip-version-check faster-whisper "av<19"; fi
# warm the Whisper "small" model (~480 MB) so the first check is not slow
.venv/bin/python -c "from faster_whisper import WhisperModel; WhisperModel('small', device='cpu', compute_type='int8')" >/dev/null

key=no
[ -n "$GEMINI_API_KEY" ] && key=env
grep -q '^GEMINI_API_KEY=' "$HOME/.config/gemini.env" 2>/dev/null && key=file
echo "Gemini key: $key (expected: env or file ~/.config/gemini.env)"
echo "LIB=$LIB"
