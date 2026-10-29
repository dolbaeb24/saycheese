#!/usr/bin/env python3
"""Russian narration in one chunk. The key is read from the local env file and never printed."""
import json, sys, time, base64, wave, urllib.request, urllib.error
from pathlib import Path

import os
key = os.environ.get("GEMINI_API_KEY")
for ENV in (Path.home() / ".config/gemini.env", Path.home() / ".config/gbro/gemini.env"):
    if not key and ENV.exists():
        key = next((l.split("=", 1)[1].strip() for l in ENV.read_text().splitlines() if l.startswith("GEMINI_API_KEY=")), None)
if not key:
    sys.exit("GEMINI_API_KEY missing")

MODEL = "gemini-2.5-flash-preview-tts"
CHUNKS = [
    ("a", "Запотевшие стёкла зимой — это не мороз снаружи. Это вода из вашего дыхания. За час человек выдыхает около столовой ложки воды, а ещё тает снег на ботинках. В тёплом воздухе этот пар невидим. Но у ледяного стекла воздух остывает, а холодный воздух удерживает в разы меньше влаги. При плюс двадцати и обычной влажности порог — около плюс девяти градусов. Это точка росы. Стекло холоднее — и лишняя вода оседает на нём миллионами крошечных капель. Что делать? Первое — выключите рециркуляцию. Она гоняет по кругу ваш же влажный воздух. Включите забор воздуха с улицы. Морозный воздух почти сухой: нагрейте его до двадцати градусов — и влажность упадёт примерно до десяти процентов. Второе — включите кондиционер, даже зимой. Воздух проходит через холодный испаритель, влага оседает на нём и стекает наружу, а печка нагревает уже сухой воздух. Третье — обдув лобового стекла, вентилятор на максимум. Тёплый поток поднимает температуру стекла выше точки росы, и капли испаряются. В сильный мороз кондиционер может не включиться — тогда главную работу делает свежий воздух. И не протирайте стекло рукой: жирные разводы потом запотевают ещё быстрее. Сухой воздух и тёплое стекло — и через минуту снова видно дорогу."),
]
out = Path(__file__).resolve().parent / "voice"
out.mkdir(exist_ok=True)
only = set(sys.argv[1:])

def synth(text):
    body = {
        "model": MODEL,
        "input": [{"type": "user_input", "content": [{"type": "text", "text": text}]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": "Kore"}]},
    }
    req = urllib.request.Request(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
    )
    delay = 22
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                payload = json.load(resp)
            break
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8", "replace").replace(key, "[redacted]")
            if e.code == 429 and "per day" not in err and attempt < 4:
                time.sleep(delay); delay = min(70, delay * 1.5); continue
            sys.exit(f"HTTP {e.code}\n{err[:400]}")
    for step in payload.get("steps", []):
        for block in step.get("content", []) or []:
            if block.get("type") == "audio" and block.get("data"):
                return base64.b64decode(block["data"]), block.get("sample_rate", 24000)
    sys.exit("no audio")

first = True
for cid, text in CHUNKS:
    if only and cid not in only and "force" not in only:
        continue
    dest = out / f"{cid}.wav"
    if dest.exists() and dest.stat().st_size > 1000 and "force" not in only:
        print(cid, "cached"); continue
    if not first:
        time.sleep(21)
    first = False
    data, sr = synth(text)
    if data[:4] == b"RIFF":
        dest.write_bytes(data)
    else:
        with wave.open(str(dest), "w") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(data)
    print(cid, dest.stat().st_size, flush=True)
