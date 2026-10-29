#!/usr/bin/env python3
"""Russian narration. The key is read from the local env file and never printed."""
import json, sys, time, base64, urllib.request, urllib.error
from pathlib import Path

import os
key = os.environ.get("GEMINI_API_KEY")
for ENV in (Path.home() / ".config/gemini.env", Path.home() / ".config/gbro/gemini.env"):
    if not key and ENV.exists():
        key = next((l.split("=", 1)[1].strip() for l in ENV.read_text().splitlines() if l.startswith("GEMINI_API_KEY=")), None)
for line in ENV.read_text().splitlines():
    if line.startswith("GEMINI_API_KEY="):
        key = line.split("=", 1)[1].strip()
if not key:
    sys.exit("GEMINI_API_KEY missing")

LINES = [
    ("l1", "В любом городе-миллионнике есть двое с одинаковым числом волос."),
    ("l2", "И это можно доказать, не считая ни одной головы."),
    ("l3", "Вот три человека и всего два возможных числа: ноль и один."),
    ("l4", "Третьему некуда деться."),
    ("l5", "Это принцип Дирихле. Если людей больше, чем чисел, у двоих число одно."),
    ("l6", "Число волос — целое, от нуля и выше."),
    ("l7", "Даже если разрешить пятьсот тысяч, вариантов всего пятьсот тысяч один. Ноль тоже считается."),
    ("l8", "В городе миллион человек. Это больше."),
    ("l9", "Ящики кончаются, и следующий садится не один."),
    ("l10", "Кто они, неизвестно. Что они есть, уже доказано."),
]
STYLE = "Clear Russian explainer for a short vertical film. Confident, warm, precise, medium pace. No advertising tone, no whisper, no rush. Land the last word of each sentence."
out = Path(__file__).resolve().parent / "voice"
out.mkdir(exist_ok=True)
only = set(sys.argv[1:])

def synth(text):
    body = {
        "model": "gemini-3.8-flash-tts",
        "input": [{"type": "user_input", "content": [{
            "type": "text", "text": text,
            "annotations": [{"type": "speech_metadata", "style": STYLE}],
        }]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": "Kore"}]},
    }
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    delay = 22
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                payload = json.load(resp)
            break
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8", "replace").replace(key, "[redacted]")
            if e.code == 429 and attempt < 5:
                time.sleep(delay)
                delay = min(70, delay * 1.4)
                continue
            sys.exit(f"HTTP {e.code}\n{err[:500]}")
    for step in payload.get("steps", []):
        for block in step.get("content", []) or []:
            if block.get("type") == "audio" and block.get("data"):
                return base64.b64decode(block["data"])
    sys.exit("no audio")

for lid, text in LINES:
    if only and lid not in only:
        continue
    dest = out / f"{lid}.wav"
    if dest.exists() and dest.stat().st_size > 1000 and "force" not in only:
        print(lid, "cached", dest.stat().st_size)
        continue
    dest.write_bytes(synth(text))
    print(lid, dest.stat().st_size)
    time.sleep(21)
