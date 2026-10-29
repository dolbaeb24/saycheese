#!/usr/bin/env python3
"""Quiet bed, landings, and the Russian voice. Loudness is finished by mux.sh."""
import os, json, wave
from pathlib import Path
import numpy as np
import sys
LIB = Path(os.environ.get("LIB", Path.home() / "lemo-opuscar"))
sys.path.insert(0, str(LIB))
from core.audio.sfx import SR, add, lp, compress, thump, whoosh

HERE = Path(__file__).resolve().parent
DUR = 52.4
# Loudnorm's progress clock stops ~3s before a file this length, and mux.sh
# treats that as a truncated wav. The extra silence is cut by -shortest.
N = int((DUR + 8) * SR)

def load_wav(path):
    with wave.open(str(path)) as w:
        sr, ch = w.getframerate(), w.getnchannels()
        raw = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    if ch > 1:
        raw = raw.reshape(-1, ch).mean(axis=1)
    if sr != SR:
        from scipy.signal import resample_poly
        raw = resample_poly(raw, SR, sr).astype(np.float32)
    return raw

def bed(n):
    tt = np.arange(n) / SR
    x = np.zeros(n, np.float32)
    for f, a in ((146.83, 0.55), (220.0, 0.28), (293.66, 0.14)):
        x += a * np.sin(2 * np.pi * f * tt)
    x *= 0.72 + 0.28 * np.sin(2 * np.pi * 0.06 * tt)
    env = np.minimum(1, tt / 1.4) * np.minimum(1, np.maximum(0, DUR - tt) / 1.6)
    return (lp(x, 680) * env * 0.16).astype(np.float32)

music = np.zeros((N, 2), np.float32)
sfx = np.zeros((N, 2), np.float32)
voice = np.zeros((N, 2), np.float32)
add(music, bed(N), 0, 0.9, 0)

ev = json.loads((HERE / "events.json").read_text())["ev"]
for e in ev:
    if e["type"] == "land":
        add(sfx, thump(0.7, 78), e["t"], 0.42, 0)
    elif e["type"] == "arc":
        add(sfx, whoosh(0.45, 0.55), e["t"], 0.28, 0.15)

VOICE = [
    ("l1", 0.40), ("l2", 5.82), ("l3", 10.45), ("l4", 16.25), ("l5", 19.23),
    ("l6", 26.45), ("l7", 30.65), ("l8", 38.13), ("l9", 42.27), ("l10", 46.38),
]
voice_env = np.zeros(N, np.float32)
for lid, t in VOICE:
    x = compress(load_wav(HERE / "voice" / f"{lid}.wav"), thr=0.18, ratio=3.0)
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
pcm = np.clip(buf, -1, 1)
with wave.open(str(out), "w") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((pcm * 32767).astype(np.int16).tobytes())
print(out, f"peak {peak:.3f}", f"picture {DUR:.2f}s", f"file {N / SR:.2f}s")
