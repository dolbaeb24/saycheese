#!/usr/bin/env python3
"""Russian narration through Gemini TTS (Interactions API). The key is never printed.

Usage:
  python tts_gemini.py lines.json voice_dir [--model M] [--fallback M2] [--voice Kore] [--style "..."] [id ...] [force]

lines.json = [{"id": "a", "text": "...", "style": "optional per-line style"}]
Writes voice_dir/<id>.wav (mono 16-bit, 24 kHz). Existing files are kept unless "force" is given.
"""
import argparse, base64, json, os, sys, time, urllib.error, urllib.request, wave
from pathlib import Path

URL = "https://generativelanguage.googleapis.com/v1beta/interactions"
DEFAULT_STYLE = ("Clear Russian explainer for a short vertical film. Confident, warm, precise, medium pace. "
                 "No advertising tone, no whisper, no rush. Land the last word of each sentence.")


def load_key():
    key = os.environ.get("GEMINI_API_KEY")
    for env in (Path.home() / ".config/gemini.env", Path.home() / ".config/gbro/gemini.env"):
        if not key and env.exists():
            key = next((l.split("=", 1)[1].strip() for l in env.read_text().splitlines() if l.startswith("GEMINI_API_KEY=")), None)
    if not key:
        sys.exit("GEMINI_API_KEY missing: set the env var or put GEMINI_API_KEY=... into ~/.config/gemini.env")
    return key


class DailyCap(Exception):
    pass


def synth(key, model, voice, text, style):
    block = {"type": "text", "text": text}
    if style and "2.5" not in model:      # the 2.5 preview model ignores or rejects style annotations
        block["annotations"] = [{"type": "speech_metadata", "style": style}]
    body = {
        "model": model,
        "input": [{"type": "user_input", "content": [block]}],
        "response_format": {"type": "audio"},
        "generation_config": {"speech_config": [{"voice": voice}]},
    }
    req = urllib.request.Request(URL, data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json", "x-goog-api-key": key})
    delay = 22
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=180) as resp:
                payload = json.load(resp)
            break
        except urllib.error.HTTPError as e:
            err = e.read().decode("utf-8", "replace").replace(key, "[redacted]")
            if e.code == 429 and ("per day" in err or "PerDay" in err):
                raise DailyCap(err[:300])
            if e.code in (429, 500, 503) and attempt < 5:
                time.sleep(delay); delay = min(70, delay * 1.5); continue
            sys.exit(f"HTTP {e.code} from {model}\n{err[:500]}")
    for step in payload.get("steps", []):
        for blk in step.get("content", []) or []:
            if blk.get("type") == "audio" and blk.get("data"):
                return base64.b64decode(blk["data"]), int(blk.get("sample_rate", 24000))
    sys.exit("no audio in the response")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("lines"); ap.add_argument("out")
    ap.add_argument("--model", default="gemini-3.8-flash-tts")
    ap.add_argument("--fallback", default="gemini-2.5-flash-preview-tts")
    ap.add_argument("--voice", default="Kore")
    ap.add_argument("--style", default=DEFAULT_STYLE)
    ap.add_argument("only", nargs="*")
    a = ap.parse_args()
    key = load_key()
    lines = json.load(open(a.lines, encoding="utf-8"))
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    force = "force" in a.only
    only = {x for x in a.only if x != "force"}
    model, first, used = a.model, True, {}
    for ln in lines:
        lid = ln["id"]
        if only and lid not in only:
            continue
        dest = out / f"{lid}.wav"
        if dest.exists() and dest.stat().st_size > 1000 and not force:
            print(lid, "cached"); continue
        if not first:
            time.sleep(21)                    # free tier: a few requests per minute
        first = False
        try:
            data, sr = synth(key, model, a.voice, ln["text"], ln.get("style", a.style))
        except DailyCap:
            if model == a.fallback or not a.fallback:
                sys.exit("daily TTS cap reached on every model; try again after the quota resets")
            print(f"! daily cap on {model}; switching to {a.fallback} (same voice, no style control)", flush=True)
            model = a.fallback
            data, sr = synth(key, model, a.voice, ln["text"], None)
        if data[:4] == b"RIFF":
            dest.write_bytes(data)
        else:                                  # raw 16-bit PCM
            with wave.open(str(dest), "w") as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(data)
        used[lid] = model
        print(lid, model, dest.stat().st_size, flush=True)
    if used:
        log = out / "models.json"
        prev = json.load(open(log)) if log.exists() else {}
        prev.update(used); json.dump(prev, open(log, "w"), indent=1)


if __name__ == "__main__":
    main()
