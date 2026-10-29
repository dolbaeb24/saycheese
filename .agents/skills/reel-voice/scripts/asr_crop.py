#!/usr/bin/env python3
"""Re-check one suspicious stretch of audio with a wider beam.

Usage: $LIB/.venv/bin/python asr_crop.py file.(wav|mp4) t0 t1
Whisper sometimes skips 10-20 s of a long file or mishears normal Russian («рассы» for «росы»,
«порок» for «порог»). Transcribing the cropped stretch alone tells a recognition slip from a real TTS stumble.
"""
import subprocess, sys, tempfile
import soundfile as sf
from faster_whisper import WhisperModel

src, t0, t1 = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
with tempfile.NamedTemporaryFile(suffix=".wav") as tmp:
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t0), "-to", str(t1), "-i", src,
                    "-ac", "1", "-ar", "16000", tmp.name], check=True)
    a, sr = sf.read(tmp.name, dtype="float32")
m = WhisperModel("small", device="cpu", compute_type="int8")
segs, _ = m.transcribe(a, language="ru", vad_filter=False, beam_size=8)
for s in segs:
    print(f"{s.start + t0:6.2f} {s.text}")
