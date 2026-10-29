import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly
from faster_whisper import WhisperModel
m = WhisperModel("small", device="cpu", compute_type="int8")
out = {}
for k in "a":
    raw, sr = sf.read(f"voice/{k}.wav", dtype="float32")
    if raw.ndim > 1: raw = raw.mean(1)
    x = resample_poly(raw, 16000, sr).astype(np.float32)
    segs, _ = m.transcribe(x, language="ru", word_timestamps=True, vad_filter=False, beam_size=5)
    W = []
    for s in segs:
        for w in s.words: W.append([round(w.start, 2), round(w.end, 2), w.word.strip()])
    out[k] = {"dur": len(raw) / sr, "words": W}
    print(k, round(len(raw) / sr, 2)); print(" ".join(f"{w[0]}:{w[2]}" for w in W))
json.dump(out, open("voice/words.json", "w"), ensure_ascii=False)
