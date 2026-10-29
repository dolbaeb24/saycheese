#!/usr/bin/env python3
"""Word timings for every voice chunk (faster-whisper "small", Russian).

Usage: $LIB/.venv/bin/python words.py voice_dir [id ...]
Writes voice_dir/words.json = {id: {"dur": seconds, "words": [[start, end, word], ...]}}
and prints each chunk as "start:word" so the transcript can be compared with the script by eye.
"""
import json, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from faster_whisper import WhisperModel

vdir = Path(sys.argv[1]); ids = sys.argv[2:] or sorted(p.stem for p in vdir.glob("*.wav"))
m = WhisperModel("small", device="cpu", compute_type="int8")
out = {}
for k in ids:
    raw, sr = sf.read(vdir / f"{k}.wav", dtype="float32")
    if raw.ndim > 1:
        raw = raw.mean(1)
    x = resample_poly(raw, 16000, sr).astype(np.float32)   # pass an array: no ffmpeg decode, exact timing
    segs, _ = m.transcribe(x, language="ru", word_timestamps=True, vad_filter=False, beam_size=5)
    W = [[round(w.start, 2), round(w.end, 2), w.word.strip()] for s in segs for w in s.words]
    out[k] = {"dur": round(len(raw) / sr, 3), "words": W}
    print(k, round(len(raw) / sr, 2))
    print(" ".join(f"{w[0]}:{w[2]}" for w in W))
json.dump(out, open(vdir / "words.json", "w"), ensure_ascii=False)
