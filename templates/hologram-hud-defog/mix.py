"""mix.py — "Запотевшие стёкла": synth pad + HUD foley + blower noise + voice, ducked under narration → mix.wav (DUR + 8 s, mux trims)."""
import os, sys, json, numpy as np, soundfile as sf
from scipy.signal import resample_poly
from scipy.ndimage import uniform_filter1d, maximum_filter1d
D = os.path.dirname(os.path.abspath(__file__)); ROOT = os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar'))
sys.path.insert(0, ROOT)
from core.audio.sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, add, limit

E = json.load(open(os.path.join(D, 'events.json'))); EV = E['ev']; DUR = E['dur']
N = int(round((DUR + 8) * SR))
rng = np.random.default_rng(7)
fol = np.zeros((N, 2)); amb = np.zeros((N, 2)); vox = np.zeros((N, 2)); mus = np.zeros((N, 2))
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
D5, F5, A5, C6, D6, E6 = 74, 77, 81, 84, 86, 88

def sine(f, d, tau=None):
    x = np.sin(2 * np.pi * f * t_(d)); return x * env_exp(d, tau) if tau else x
def att(x, a=.004):
    n = min(len(x), int(a * SR)); x = x.copy(); x[:n] *= np.linspace(0, 1, n); return x
def blip(m, d=.09, v=1.0, fm=0.0):
    tt = t_(d); f = hz(m)
    return att(np.sin(2 * np.pi * f * tt + fm * np.sin(2 * np.pi * f * 2 * tt) * env_exp(d, .02)) * env_exp(d, d * .3)) * v
def tick(v=1.0, f=3200):
    d = .018; return att(norm(bp(noise(d), f * .7, f * 1.5) * env_exp(d, .002) + sine(f, d, .003) * .5)) * v
def lock_hit(v=1.0):
    d = .6; tt = t_(d); f = 95 * np.exp(-tt * 9) + 42
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .16)
    clk = bp(noise(.05), 1800, 7000) * env_exp(.05, .006)
    metal = sum(sine(fr, .25, .05) * a for fr, a in [(1210, .5), (2717, .3), (4430, .18)])
    x = body.copy(); x[:len(clk)] += clk * .7; x[:len(metal)] += metal * .45
    for dl, m, a in [(.07, D6 + 12, .35), (.13, A5 + 12, .3)]:
        b = blip(m, .07, a); s = int(dl * SR); x[s:s + len(b)] += b
    return att(norm(x)) * v
def confirm(v=1.0):
    d = 1.1; tt = t_(d); x = np.zeros(len(tt))
    for m, a, dl in [(D6, 1, 0), (D6 + 7, .7, .03), (E6 + 12, .45, .06)]:
        s = int(dl * SR); u = tt[:len(tt) - s]
        x[s:] += np.sin(2 * np.pi * hz(m) * u * (1 + .002 * np.sin(2 * np.pi * 5 * u))) * env_exp(d - dl, .28)[:len(u)] * a
    return att(norm(x), .01) * v
def roll(d, v=1.0):
    n = max(1, int(d * 24)); x = np.zeros(int((d + .05) * SR))
    for i in range(n):
        s = int(i / 24 * SR); tk = tick(1.0, 2600 + 900 * (i % 3)); x[s:s + len(tk)] += tk * (0.6 + 0.4 * i / n)
    return x * v
def zip_(up=True, d=.14):
    tt = t_(d); f0, f1 = (700, 2600) if up else (2600, 700); f = f0 * (f1 / f0) ** (tt / d)
    return att(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d))
def whoosh(d=.5, lo=300, hi=3500, v=1.0):
    n = noise(d); out = np.zeros_like(n); L = len(n); step = 480
    for i in range(0, L, step):
        u = i / L; fc = lo * (hi / lo) ** u; w = min(step, L - i)
        out[i:i + w] = bp(n[max(0, i - 1500):i + w], fc * .7, min(fc * 1.4, SR / 2 - 100))[-w:]
    return norm(out * np.sin(np.pi * t_(d) / d) ** 1.5) * v
def servo(d, f0=180, f1=420, v=1.0):
    tt = t_(d); f = f0 + (f1 - f0) * tt / d; saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    return att((lp(saw, 1400) * .6 + bp(noise(d), 900, 2400) * .25) * np.sin(np.pi * tt / d) ** .5) * v
def glitch(d=.13):
    x = np.zeros(int(d * SR)); pos = 0
    while pos < len(x):
        L = int(rng.uniform(.008, .03) * SR); hold = int(rng.integers(8, 60))
        blk = np.repeat(rng.uniform(-1, 1, L // hold + 1), hold)[:L] * rng.uniform(.3, 1)
        x[pos:pos + L] = blk[:len(x) - pos]; pos += L + int(rng.uniform(0, .006) * SR)
    return hp(x, 200)
def ping(m=A5 + 12):
    d = .6; return att(sine(hz(m), d, .15) + sine(hz(m) * 2.01, d, .05) * .2)
def iris():
    d = .3; x = bp(noise(d), 3000, 9000) * env_exp(d, .05) * .5; z = zip_(True, .25) * .5; x[:len(z)] += z; return att(x)
def wave_zap(d=1.0):
    tt = t_(d); f = 900 + 500 * np.sin(2 * np.pi * 6 * tt)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .35) * .5 + bp(noise(d), 4000, 9000) * env_exp(d, .2) * .3
    return att(x)
def flip():
    d = .35; tt = t_(d); f = 300 * (1400 / 300) ** (tt / d)
    return att(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .12) + bp(noise(d), 2000, 6000) * env_exp(d, .04) * .5)
def jitter(d):
    x = np.zeros(int((d + .05) * SR)); n = int(d * 30)
    for i in range(n):
        s = int(rng.uniform(0, d) * SR); tk = tick(rng.uniform(.4, 1), rng.uniform(1800, 5200)); x[s:s + len(tk)] += tk
    return x * np.clip(np.linspace(0, 3, len(x)), 0, 1)
def ding_bell():
    d = 2.2; tt = t_(d)
    x = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) * a for f, tau, a in [(1568, .9, 1), (3136 * 1.003, .45, .35), (4704 * 1.01, .25, .2), (2350, .6, .25)])
    return att(norm(x), .002)

def breath(d=1.3):
    tt = t_(d); e = np.sin(np.pi * np.clip(tt / d, 0, 1)) ** 1.6
    return att(norm(bp(noise(d), 500, 2600) * e), .05)
def plink(m, v=1.0):
    d = .22; tt = t_(d); f = hz(m) * (1 + .5 * np.exp(-tt * 40))
    return att(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .045)) * v
def drops(d):
    x = np.zeros(int((d + .3) * SR)); n = int(d * 14)
    for i in range(n):
        s = int(rng.uniform(0, d) * SR); p = plink(int(rng.integers(88, 101)), rng.uniform(.3, 1)); x[s:s + len(p)] += p
    return x
def drip():
    d = .35; tt = t_(d); f = 1400 * np.exp(-tt * 9) + 500
    return att(np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .07))
def slide(d):
    tt = t_(d); f = 520 * (300 / 520) ** (tt / d)
    return att((np.sin(2 * np.pi * np.cumsum(f) / SR) * .5 + bp(noise(d), 1500, 4000) * .15) * np.sin(np.pi * tt / d) ** .6)
def shimmer(d, up=True):
    tt = t_(d); x = np.zeros(len(tt))
    for j, m in enumerate([D6 + 12, A5 + 12, F5 + 12, E6 + 12]):
        x += np.sin(2 * np.pi * hz(m) * tt * (1 + .003 * np.sin(2 * np.pi * (3 + j) * tt))) * .25
    x += bp(noise(d), 5000, 10000) * .3
    e = (tt / d) if up else (1 - tt / d)
    return att(x * np.clip(e, 0, 1) ** 1.5 * np.sin(np.pi * tt / d) ** .3, .05)
def warm(d):
    tt = t_(d); e = np.sin(np.pi * tt / d) ** 1.2
    return att((lp(noise(d), 500) * 2.5 + np.sin(2 * np.pi * 110 * tt) * .3 + np.sin(2 * np.pi * 165 * tt) * .15) * e, .05)
def warn():
    x = np.zeros(int(.6 * SR))
    for dl, m in [(0, A5), (.18, F5)]:
        b = att(np.sign(np.sin(2 * np.pi * hz(m) * t_(.14))) * env_exp(.14, .09)); b = lp(b, 2500); s = int(dl * SR); x[s:s + len(b)] += b
    return x

# ---------- Blower noise (on between fanOn/fanOff, louder after fanMax) ----------
tt = np.arange(N) / SR
fan_env = np.zeros(N); on = None
for e in sorted(EV, key=lambda e: e['t']):
    if e['k'] == 'fanOn': on = e['t']
    if e['k'] == 'fanOff' and on is not None: fan_env[int(on * SR):int(e['t'] * SR)] = 1; on = None
mx = next((e['t'] for e in EV if e['k'] == 'fanMax'), DUR)
fan_env *= np.where(tt >= mx, 2.0, 1.0)
fan_env = uniform_filter1d(fan_env, int(.6 * SR))
blow = lp(hp(noise(DUR + 8)[:N], 150), 1500); blow /= np.abs(blow).max() + 1e-9
blow2 = lp(hp(noise(DUR + 8)[:N], 150), 1500); blow2 /= np.abs(blow2).max() + 1e-9
whir = np.sin(2 * np.pi * 180 * tt) * .2 * (1 + .2 * np.sin(2 * np.pi * 3 * tt))
_b = brown(DUR + 8.1); room = lp(np.pad(_b, (0, max(0, N - len(_b))))[:N], 500); room /= np.abs(room).max() + 1e-9
fade = np.clip(tt / .3, 0, 1) * np.clip((DUR - .2 - tt) / 1.5, 0, 1)
amb[:, 0] += ((blow + whir * .3) * .045 * fan_env + room * .04) * fade
amb[:, 1] += ((blow2 + whir * .3) * .045 * fan_env + room * .04) * fade

# ---------- Synth pad (E minor, cold; 4 chords x 4 s) + soft arpeggio ----------
chords = [[52, 59, 64, 67], [48, 55, 60, 64], [50, 57, 62, 66], [47, 54, 59, 62]]
pad = np.zeros((N, 2)); arp = np.zeros((N, 2))
bar = 4.0
for k in range(int((DUR + 4) / bar)):
    t0 = k * bar; ch = chords[k % 4]; d = bar + 1.0; u = t_(d)
    e = np.clip(u / 1.2, 0, 1) * np.clip((d - u) / 1.4, 0, 1)
    x = sum(np.sin(2 * np.pi * hz(m) * u * (1 + dt)) for m in ch for dt in (-.0015, .0015)) * e
    add(pad, x, t0, .05)
    for j in range(16):
        m = ch[j % 4] + 24; s = t0 + j * .25
        if s > DUR - 2.5: break
        add(arp, blip(m, .18, 1), s, .045 if j % 4 else .07, (-.35, .35)[j % 2])
pad = np.stack([lp(pad[:, 0], 2400), lp(pad[:, 1], 2400)], 1); arp = np.stack([lp(arp[:, 0], 5000), lp(arp[:, 1], 5000)], 1)
mfade = np.clip(tt / 1.5, 0, 1) * np.clip((DUR - .3 - tt) / 2.5, 0, 1)
mus[:] = (pad + arp) * mfade[:, None]

# ---------- Events ----------
for e in EV:
    t, k = e['t'], e['k']
    if k == 'scan':
        d = e['d']; u = t_(d); f = 220 * (1300 / 220) ** (u / d)
        add(fol, whoosh(d, 250, 5000, .5) + np.sin(2 * np.pi * np.cumsum(f) / SR) * (u / d) ** 1.5 * .35, t, .5)
    elif k == 'scanDown':
        d = e['d']; u = t_(d); f = 1300 * (200 / 1300) ** (u / d)
        add(fol, whoosh(d, 5000, 250, .5) + np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - u / d) * .3, t, .42)
    elif k == 'lock': add(fol, lock_hit(), t, .8)
    elif k == 'roll': add(fol, roll(e['d']), t, .15)
    elif k == 'confirm': add(fol, confirm(), t, .3 * e.get('v', 1))
    elif k == 'tick': add(fol, blip(A5 + 12, .06, 1), t, .25); add(fol, blip(D6 + 12, .08, .8), t + .06, .25)
    elif k == 'whoosh': add(fol, whoosh(e['d'], 300, 4000), t, .32)
    elif k == 'servo': add(fol, servo(e['d'], 160, 380), t, .2, -.3)
    elif k == 'iris': add(fol, iris(), t, .35)
    elif k == 'zip': add(fol, zip_(True, .2), t, .25)
    elif k == 'fog': add(fol, shimmer(e['d'], True), t, .06)
    elif k == 'breath': add(fol, breath(), t, .22, .25)
    elif k == 'slide': add(fol, slide(e['d']), t, .16)
    elif k == 'drops': add(fol, drops(e['d']), t, .22, rng.uniform(-.3, .3))
    elif k == 'drip': add(fol, drip(), t, .35); add(fol, drip(), t + .55, .25)
    elif k == 'warm': add(fol, warm(e['d']), t, .3)
    elif k == 'clear': add(fol, shimmer(e['d'], False), t, .12)
    elif k == 'warn': add(fol, warn(), t, .3)
    elif k == 'fanOn': add(fol, servo(.4, 120, 260), t, .15)
    elif k == 'fanMax': add(fol, whoosh(.8, 200, 2500), t, .25)
    elif k == 'fanOff': add(fol, servo(.5, 260, 110), t, .15)

for k, t0 in [('a', 0.30)]:
    a, sr = sf.read(os.path.join(D, 'voice', k + '.wav'))
    if a.ndim > 1: a = a.mean(1)
    add(vox, resample_poly(a, SR, sr), t0, 1.4)

vo_env = maximum_filter1d((np.abs(vox).max(1) > .01).astype(float), int(.5 * SR))
vo_env = uniform_filter1d(vo_env, int(.2 * SR))
mus *= (1 - .8 * np.clip(vo_env * 1.6, 0, 1))[:, None]
amb *= (1 - .35 * np.clip(vo_env, 0, 1))[:, None]
keep = np.zeros(N)
for e in EV:
    if e['k'] in ('lock', 'confirm', 'warn'): keep[int(e['t'] * SR):int((e['t'] + .2) * SR)] = 1
keep = uniform_filter1d(keep, int(.02 * SR))
fol *= (1 - .7 * np.clip(vo_env * 1.6, 0, 1) * (1 - keep))[:, None]
mix = mus + fol + amb + vox
for i in range(2): mix[:, i] = limit(mix[:, i], .95)
sf.write(os.path.join(D, 'mix.wav'), mix.astype(np.float32), SR)
print('mix.wav', round(N / SR, 2), 's;', len(EV), 'events; peak', float(np.abs(mix).max()))
