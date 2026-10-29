#!/usr/bin/env python3
"""Contact sheet of stills with the platform safe box drawn on every frame.

Usage: $LIB/.venv/bin/python safe_sheet.py out.jpg still1.jpg still2.jpg ...
Each tile is labelled with the time taken from the file name (t_12.5.jpg -> 12.5).
Write a new file name each time you re-check: some viewers cache an image by path.
"""
import sys
from PIL import Image, ImageDraw

SAFE = (70, 230, 930, 1480)
out, files = sys.argv[1], sorted(sys.argv[2:], key=lambda f: float(f.rsplit('_', 1)[-1].rsplit('.', 1)[0]))
cols = min(5, len(files)); rows = (len(files) + cols - 1) // cols
w, h = 432, 768
S = Image.new('RGB', (cols * w, rows * h), (20, 20, 20)); d = ImageDraw.Draw(S)
for i, f in enumerate(files):
    im = Image.open(f).convert('RGB')
    ImageDraw.Draw(im).rectangle(SAFE, outline=(255, 40, 40), width=4)
    S.paste(im.resize((w, h)), ((i % cols) * w, (i // cols) * h))
    d.text(((i % cols) * w + 8, (i // cols) * h + 8), f.rsplit('_', 1)[-1], fill=(255, 255, 0))
S.save(out, quality=88)
print(out, len(files), 'frames')
