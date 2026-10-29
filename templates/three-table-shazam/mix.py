#!/usr/bin/env python3
"""Quiet bed, small object sounds, and the Russian voice. Loudness is finished by mux.sh."""
import os, json, wave, sys
from pathlib import Path
import numpy as np
from scipy.signal import resample_poly
LIB = Path(os.environ.get("LIB", Path.home() / "lemo-opuscar"))
sys.path.insert(0, str(LIB))
from core.audio.sfx import SR, add, lp, compress, thump, whoosh, click, ding, clack

HERE = Path(__file__).resolve().parent
DUR = 61.0
# Loudnorm's progress clock stops a few seconds early on short files and mux.sh
# reads that as truncation, so the file runs past the picture; -shortest trims it.
N = int((DUR + 8) * SR)

def load_wav(path):
    with wave.open(str(path)) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1:
        raw = raw.reshape(-1, ch).mean(axis=1)
    return resample_poly(raw, SR, sr).astype(np.float32) if sr != SR else raw

def bed(n):
    tt = np.arange(n) / SR
    x = np.zeros(n, np.float32)
    for f, a in ((110.0, 0.5), (164.81, 0.3), (220.0, 0.18), (277.18, 0.08)):
        x += a * np.sin(2 * np.pi * f * tt + 0.3 * np.sin(2 * np.pi * 0.11 * tt))
    x *= 0.7 + 0.3 * np.sin(2 * np.pi * 0.05 * tt)
    env = np.minimum(1, tt / 1.5) * np.minimum(1, np.maximum(0, DUR - tt) / 1.8)
    return (lp(x, 640) * env * 0.16).astype(np.float32)

music = np.zeros((N, 2), np.float32)
sfx = np.zeros((N, 2), np.float32)
voice = np.zeros((N, 2), np.float32)
add(music, bed(N), 0, 0.9, 0)

ev = json.loads((HERE / "events.json").read_text())["ev"]
for e in ev:
    ty, t = e["type"], e["t"]
    if ty == "tap":
        add(sfx, clack(1.1, 0.5), t, 0.22, 0)
    elif ty == "tick":
        add(sfx, click(1.0, 0.6), t, 0.22, 0)
    elif ty == "ping":
        add(sfx, ding(0.6), t, 0.2, 0)
    elif ty == "whoosh":
        add(sfx, whoosh(0.45, 0.55), t, 0.28, 0.1)
    elif ty == "land":
        add(sfx, thump(0.7, 78), t, 0.42, 0)

VOICE = [("a", 0.30), ("b", 15.45), ("c", 36.50), ("d", 52.60)]
voice_env = np.zeros(N, np.float32)
for cid, t in VOICE:
    x = compress(load_wav(HERE / "voice" / f"{cid}.wav"), thr=0.18, ratio=3.0)
    add(voice, x, t, 1.08, 0)
    s = int(t * SR)
    voice_env[s:min(N, s + len(x))] = 1

win = int(0.05 * SR) or 1
duck = 1 - 0.5 * np.convolve(voice_env, np.ones(win) / win, mode="same")
buf = music * duck[:, None] + sfx * 0.85 + voice
peak = float(np.max(np.abs(buf)))
if peak > 0.9:
    buf *= 0.9 / peak
out = HERE / "out" / "mix.wav"
out.parent.mkdir(exist_ok=True)
with wave.open(str(out), "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((np.clip(buf, -1, 1) * 32767).astype(np.int16).tobytes())
print(out, f"peak {peak:.3f}", f"picture {DUR:.2f}s")
