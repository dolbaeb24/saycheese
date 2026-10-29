#!/bin/sh
# Quick health check: prints OK/FAIL per component, never prints the key.
LIB=${LIB:-$HOME/lemo-opuscar}
ok() { printf '%-28s %s\n' "$1" "$2"; }
command -v node >/dev/null && ok node "$(node --version)" || ok node FAIL
command -v ffmpeg >/dev/null && ok ffmpeg "$(ffmpeg -version | head -1 | cut -d' ' -f3)" || ok ffmpeg FAIL
[ -f "$LIB/core/render/video.mjs" ] && ok "lemo-opuscar ($LIB)" OK || ok "lemo-opuscar ($LIB)" FAIL
[ -x "$LIB/.venv/bin/python" ] && ok "python venv" "$("$LIB/.venv/bin/python" -V 2>&1)" || ok "python venv" FAIL
"$LIB/.venv/bin/python" -c "import numpy, scipy, soundfile, PIL" 2>/dev/null && ok "numpy/scipy/soundfile/pillow" OK || ok "numpy/scipy/soundfile/pillow" FAIL
"$LIB/.venv/bin/python" -c "import faster_whisper" 2>/dev/null && ok faster-whisper OK || ok faster-whisper FAIL
[ -d "$LIB/node_modules/playwright-core" ] && ok playwright-core OK || ok playwright-core FAIL
if [ -n "$GEMINI_API_KEY" ] || grep -q '^GEMINI_API_KEY=' "$HOME/.config/gemini.env" 2>/dev/null; then ok "Gemini key" present; else ok "Gemini key" MISSING; fi
