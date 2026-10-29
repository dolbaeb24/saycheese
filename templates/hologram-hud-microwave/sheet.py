import sys, glob
from PIL import Image, ImageDraw
files = sys.argv[2:]; out = sys.argv[1]
cols = min(5, len(files)); rows = (len(files) + cols - 1) // cols
w, h = 432, 768
S = Image.new('RGB', (cols * w, rows * h), (20, 20, 20)); d = ImageDraw.Draw(S)
for i, f in enumerate(files):
    im = Image.open(f).resize((w, h)); S.paste(im, ((i % cols) * w, (i // cols) * h))
    d.text(((i % cols) * w + 8, (i // cols) * h + 8), f.split('_')[-1], fill=(255, 255, 0))
S.save(out, quality=88)
