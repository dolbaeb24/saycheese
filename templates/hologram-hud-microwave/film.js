// "Как работает микроволновка" · hologram-hud, 1080×1920, 24 fps. All times are absolute seconds, taken from the voice word timestamps.
import { Holo, drawScanPlane, drawPad, makeCamera } from './engine/holo.js';
import * as U from './engine/hud.js';
import { microwave, molecule, moleculeField, foodBowl, MW, MOL_C, FIELD, FOOD, HB } from './models.js';
const { clamp } = U;
const W = 1080, H = 1920, TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const sine = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => seg(t, a, a + fi) * (1 - seg(t, b - fo, b));
const FL = 3 / 24;
const flashAt = (t, tl) => t >= tl && t < tl + FL;

const HUE = 186, ACC = 28;
export const CUES = [
  [0.30, 2.75, 'Микроволновка не греет вашу еду.'],
  [3.10, 5.95, 'В ней нет ни огня, ни раскалённой спирали.'],
  [6.26, 9.40, 'Она заставляет воду внутри еды дёргаться —'],
  [9.52, 12.30, 'почти два с половиной миллиарда раз в секунду.'],
  [12.66, 14.80, 'Сбоку спрятан магнетрон.'],
  [15.02, 18.90, 'Он излучает микроволны с частотой 2,45 ГГц.'],
  [19.64, 21.85, 'Металлические стенки отражают их,'],
  [21.94, 24.30, 'а сетка на дверце не выпускает наружу:'],
  [24.46, 28.40, 'её дырочки намного меньше волны длиной 12 сантиметров.'],
  [28.80, 31.45, 'Молекула воды — как крошечная стрелка:'],
  [31.56, 33.95, 'с одной стороны плюс, с другой минус.'],
  [34.02, 37.20, 'Поле меняет направление, и стрелка разворачивается следом.'],
  [37.32, 38.95, 'Снова и снова.'],
  [39.06, 43.10, 'Молекулы толкают соседей, и эта толкотня превращается в тепло.'],
  [43.38, 46.35, 'Но волны проникают в еду всего на сантиметр-два.'],
  [46.42, 50.40, 'Середина прогревается уже от краёв, поэтому еду стоит помешать,'],
  [50.50, 53.45, 'а тарелка крутится, чтобы волны прошли по ней равномерно.'],
  [53.58, 55.85, 'Ни огня, ни спирали.'],
  [55.96, 58.90, 'Только вода, которая не может стоять на месте.'],
];
const K = {
  eda: 2.44, ogon: 3.90, spiral: 5.34, voda: 7.28, sec: 11.70, pochti: 9.52,
  mag: 13.80, mkv: 15.68, num: 16.94, ghz: 18.08, walls: 19.64, otr: 20.82, setka: 22.00, dyr: 24.74, menshe: 25.58, v12: 27.00,
  irisA: 28.45, molek: 28.80, strelka: 30.72, plus: 32.14, minus: 33.14, pole: 34.02, flip1: 34.80, razv: 36.10, snova1: 37.32, snova2: 38.24,
  molekuly: 39.06, tolk: 39.72, teplo: 42.44, outB: 42.95,
  inC: 43.25, volny: 43.68, cm: 45.36, seredina: 46.42, kraev: 47.98, pomesh: 49.68, tarelka: 50.62, outC: 53.25,
  inD: 53.55, ogon2: 54.48, spiral2: 55.20, voda2: 56.12, mesto: 58.08, ding: 58.95, outD: 59.40, title: 60.30,
};
export const DUR = 61.8;
const SC = { A: [0, K.irisA + 0.6], B: [K.irisA, K.outB + 0.6], C: [K.inC, K.outC + 0.6], D: [K.inD, DUR] };

// ---------- Sound events ----------
const EV = [];
const ev = (t, k, o = {}) => EV.push({ t: +t.toFixed(3), k, ...o });
ev(0.0, 'scan', { d: 2.6 }); ev(K.eda - 0.2, 'lock');
ev(3.5, 'roll', { d: 0.4 }); ev(K.ogon, 'confirm'); ev(4.8, 'roll', { d: 0.54 }); ev(K.spiral, 'confirm');
ev(K.voda, 'tick'); ev(K.voda + 0.15, 'jitter', { d: 4.9 }); ev(9.6, 'roll', { d: 2.1 }); ev(K.sec, 'confirm');
ev(12.4, 'whoosh', { d: 1.2 }); ev(13.0, 'servo', { d: 0.9 }); ev(K.mag - 0.22, 'lock');
ev(K.mkv - 0.3, 'humOn'); ev(K.mkv, 'wave'); ev(K.num, 'roll', { d: K.ghz - K.num }); ev(K.ghz, 'confirm');
ev(18.9, 'servo', { d: 0.8, up: 0 }); ev(19.0, 'whoosh', { d: 1.2 }); ev(K.otr, 'ping'); ev(K.otr + 0.5, 'ping');
ev(K.setka - 0.22, 'lock'); ev(22.6, 'ping'); ev(23.3, 'ping');
ev(24.45, 'iris'); ev(K.dyr, 'tick'); ev(K.menshe + 0.3, 'wave'); ev(25.6, 'roll', { d: K.v12 - 25.6 }); ev(K.v12, 'confirm');
ev(K.irisA, 'iris'); ev(K.irisA + 0.3, 'humOff'); ev(28.76, 'glitch'); ev(28.4, 'scan', { d: 1.1 }); ev(29.33 - 0.2, 'lock');
ev(K.strelka, 'tick'); ev(K.plus, 'tick'); ev(K.minus, 'tick');
ev(K.pole, 'zip'); ev(K.flip1, 'flip'); ev(35.6, 'servo', { d: 1.2 }); ev(K.snova1 + 0.03, 'flip'); ev(K.snova2 + 0.01, 'flip');
ev(39.0, 'whoosh', { d: 1.4 }); ev(K.tolk, 'jitter', { d: 3.2 }); ev(40.2, 'roll', { d: K.teplo - 40.2 }); ev(K.teplo, 'confirm');
ev(K.outB, 'scanDown', { d: 0.6 }); ev(K.inC, 'scan', { d: 1.05 }); ev(K.volny, 'wave');
ev(44.8, 'roll', { d: K.cm - 44.8 }); ev(K.cm, 'confirm'); ev(K.pomesh, 'whoosh', { d: 0.8 }); ev(K.tarelka, 'servo', { d: 2.5 });
ev(K.outC, 'scanDown', { d: 0.6 }); ev(K.inD, 'scan', { d: 1.15 }); ev(K.inD + 0.3, 'humOn');
ev(K.ogon2 - 0.25, 'tick'); ev(K.spiral2 - 0.25, 'tick'); ev(K.voda2 - 0.22, 'lock'); ev(K.voda2 + 0.3, 'tick'); ev(56.9, 'tick');
ev(K.voda2 + 0.2, 'jitter', { d: 2.6 }); ev(K.ding - 0.1, 'humOff'); ev(K.ding, 'ding'); ev(K.outD, 'scanDown', { d: 1.3 }); ev(K.title, 'confirm', { v: 0.6 });

// ---------- Cameras ----------
const C = (o) => ({ fov: 0.6, cx: 540, roll: 0, ...o });
const mixCam = (A, B, w) => ({
  ...A, target: A.target.map((x, i) => lerp(x, B.target[i], w)), yaw: lerp(A.yaw, B.yaw, w), pitch: lerp(A.pitch, B.pitch, w),
  dist: Math.exp(lerp(Math.log(A.dist), Math.log(B.dist), w)), cx: lerp(A.cx, B.cx, w), cy: lerp(A.cy, B.cy, w),
});
const CAM = {
  a0: C({ target: [0, 0.5, 0], yaw: 0.66, pitch: 0.30, dist: 7.3, cy: 1110 }),
  a1: C({ target: [0, 0.5, 0], yaw: 0.50, pitch: 0.28, dist: 7.0, cy: 1110 }),
  mag: C({ target: [0.26, 0.55, -0.08], yaw: 0.98, pitch: 0.30, dist: 6.1, cy: 1100 }),
  mag2: C({ target: [0.24, 0.55, -0.08], yaw: 1.10, pitch: 0.27, dist: 5.9, cy: 1100 }),
  front: C({ target: [-0.08, 0.5, 0], yaw: 0.24, pitch: 0.16, dist: 6.7, cy: 1110 }),
  front2: C({ target: [-0.15, 0.5, 0.1], yaw: 0.14, pitch: 0.12, dist: 6.2, cy: 1110 }),
  mol: C({ target: MOL_C, yaw: 0.34, pitch: 0.10, dist: 8.4, cy: 1010 }),
  mol2: C({ target: MOL_C, yaw: 0.18, pitch: 0.08, dist: 8.2, cy: 1010 }),
  molFar: C({ target: [0, MOL_C[1], 0], yaw: 0.10, pitch: 0.05, dist: 23.5, cy: 1110 }),
  food: C({ target: [0, 0.3, 0], yaw: -0.05, pitch: 0.86, dist: 10.2, cy: 1090 }),
  food2: C({ target: [0, 0.3, 0], yaw: 0.22, pitch: 0.80, dist: 9.7, cy: 1090 }),
  end: C({ target: [0, 0.5, 0], yaw: 0.56, pitch: 0.30, dist: 7.6, cy: 1150 }),
};
function camA(t) {
  if (t < 12.4) return mixCam(CAM.a0, CAM.a1, sine(seg(t, 0, 12.4)));
  if (t < 13.7) return mixCam(CAM.a1, CAM.mag, eio(seg(t, 12.4, 13.7)));
  if (t < 19.0) return mixCam(CAM.mag, CAM.mag2, sine(seg(t, 13.7, 19.0)));
  if (t < 20.3) return mixCam(CAM.mag2, CAM.front, eio(seg(t, 19.0, 20.3)));
  return mixCam(CAM.front, CAM.front2, sine(seg(t, 20.3, 29.2)));
}
function camB(t) {
  if (t < 39.0) return mixCam(CAM.mol, CAM.mol2, sine(seg(t, 28.4, 39.0)));
  return mixCam(CAM.mol2, CAM.molFar, eio(seg(t, 39.0, 40.7)));
}
const camC = t => mixCam(CAM.food, CAM.food2, sine(seg(t, 43.2, 53.9)));
const camD = t => mixCam(CAM.end, { ...CAM.end, yaw: 0.42, dist: 7.4 }, sine(seg(t, 53.5, 61.8)));

// ---------- Wave rays in the cavity (billiard paths, wavelength to scale: 12 cm × S) ----------
const LAMBDA = 0.12 * 3.3;
function bounce(p0, d0, B, L, step = 0.02) {
  const pts = [], hits = [];
  let p = p0.slice(), d = d0.map(x => x / Math.hypot(...d0));
  const lo = [B.x0, B.y0, B.z0], hi = [B.x1, B.y1, B.z1];
  for (let s = 0; s <= L; s += step) {
    pts.push(p.slice());
    for (let k = 0; k < 3; k++) {
      p[k] += d[k] * step;
      if (p[k] < lo[k] || p[k] > hi[k]) { d[k] = -d[k]; p[k] = Math.max(lo[k], Math.min(hi[k], p[k])); hits.push({ s, p: p.slice(), wall: k === 2 && p[k] >= hi[k] - 1e-6 ? 'door' : 'wall' }); }
    }
  }
  return { pts, hits, step };
}
const CAVI = { x0: MW.cav.x0 + 0.05, x1: MW.cav.x1 - 0.02, y0: MW.cav.y0 + 0.12, y1: MW.cav.y1 - 0.05, z0: MW.cav.z0 + 0.05, z1: MW.cav.z1 - 0.02 };
const RAYS = [[-1, -0.18, 0.55], [-1, 0.12, -0.35], [-1, -0.32, 0.15], [-1, 0.25, 0.8]].map(d => bounce([MW.port[0] - 0.01, MW.port[1], MW.port[2]], d, CAVI, 14));

export function makeFilm() {
  const T = U.theme(HUE, ACC);
  const mw = microwave(), mol = molecule(), fld = moleculeField(), food = foodBowl();
  const holo = new Holo(W, H);
  const off = document.createElement('canvas'); off.width = W; off.height = H;
  const offG = off.getContext('2d');
  const allField = Object.fromEntries(FIELD.map(f => [f.id, 1]));

  function render(ctx, t) {
    const frame = Math.round(t * 24);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const inA = t < SC.A[1], inB = t >= SC.B[0] && t < SC.B[1], inC = t >= SC.C[0] && t < SC.C[1], inD = t >= SC.D[0];
    if (inA && inB) {
      sceneA(ctx, t, frame, true);
      const iris = eio(seg(t, K.irisA, K.irisA + 0.6));
      const c = irisCenter(t);
      offG.setTransform(1, 0, 0, 1, 0, 0);
      sceneB(offG, t, frame, true);
      const R = lerp(0, Math.hypot(W, H), iris);
      ctx.save(); ctx.beginPath(); ctx.arc(c[0], c[1], R, 0, TAU); ctx.clip(); ctx.drawImage(off, 0, 0); ctx.restore();
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.hi(0.9 * (1 - iris)); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(c[0], c[1], R, 0, TAU); ctx.stroke(); ctx.restore();
    } else if (inA) sceneA(ctx, t, frame, true);
    else {
      const cam = inD ? camD(t) : inC ? camC(t) : camB(t);
      U.background(ctx, W, H, T, { px: -cam.yaw * 260, py: cam.pitch * 300, cx: 540, cy: 1060 });
      if (inB) sceneB(ctx, t, frame, false);
      if (inC) sceneC(ctx, t, frame);
      if (inD) sceneD(ctx, t, frame);
    }
    U.vignette(ctx, W, H, 0.55);
    if (t >= 28.76 && t < 28.76 + FL) U.glitch(ctx, W, H, 1, frame * 3.3);
    hudChrome(ctx, t, frame);
    subs(ctx, t);
  }

  let lastBowl = [W / 2, H / 2];
  const irisCenter = () => lastBowl;

  // ================= Scene A: the microwave =================
  function sceneA(ctx, t, frame, bg) {
    const cam = camA(t);
    if (bg) U.background(ctx, W, H, T, { px: -cam.yaw * 260, py: cam.pitch * 300, cx: 540, cy: 1060 });
    drawPad(ctx, cam, W, H, { hue: HUE, rot: t * 0.12, alpha: clamp(0.3 + t * 0.6) });
    const scan = t < 2.7 ? { y: lerp(-0.02, 1.08, sine(seg(t, 0, 2.6))), band: 0.06 } : null;
    const kSide = eo(seg(t, 13.0, 13.9)) * (1 - eio(seg(t, 18.9, 19.7)));
    let focus = null, dim = 0.3;
    if (t > 13.5 && t < 19.0) { focus = 'magnetron'; dim = lerp(1, 0.38, seg(t, 13.5, 13.9)) ; }
    if (t > 21.8 && t < 24.4) { focus = 'door'; dim = lerp(1, 0.4, seg(t, 21.8, 22.1)) * 1 + 0 * seg(t, 24.0, 24.4); }
    const flash = {};
    if (flashAt(t, K.mag)) flash.magnetron = 1;
    if (flashAt(t, K.setka)) flash.door = 1;
    if (flashAt(t, K.eda)) flash.bowl = 1;
    const heat = seg(t, K.voda, K.voda + 1.5) * (1 - seg(t, 12.2, 12.8));
    const info = holo.draw(ctx, mw, cam, {
      hue: HUE, scan, explode: { side: kSide, magnetron: kSide }, focus, dim, flash, scanOffset: t * 24,
      wave: heat > 0 ? { y: MW.bowl[1] + 0.02 + 0.03 * Math.sin(t * 9), w: 0.06 * heat } : null,
    });
    if (scan) drawScanPlane(ctx, cam, W, H, scan.y, { hue: HUE, r: 1.1, rot: t * 0.3, alpha: 1 - seg(t, 2.3, 2.7) });
    const P = info.project, p3 = new Float32Array(3);
    const pr = (p) => { P(p[0], p[1], p[2], p3); return [p3[0], p3[1]]; };
    lastBowl = pr(MW.bowl);

    // microwaves
    const waveA = seg(t, K.mkv, K.mkv + 0.3) * (1 - seg(t, 28.1, 28.6));
    if (waveA > 0) rays(ctx, pr, t - K.mkv, waveA, t);

    // bowl lock (food) + loupe with shaking water
    const kB = seg(t, K.eda - 0.22, K.eda) * (1 - seg(t, 9.2, 9.6));
    U.targetBox(ctx, T, info.bbox.bowl, kB, { flash: flashAt(t, K.eda), tag: 'ЕДА', pad: 16 });
    const lA = win(t, K.voda - 0.1, 12.3, 0.35, 0.35);
    if (lA > 0) waterLoupe(ctx, t, frame, lA, [540, 690], 128, info.anchor.bowl, 'ВОДА В ЕДЕ');

    // fire / coil = 0
    const out1 = 1 - seg(t, 6.0, 6.35);
    card(ctx, t, frame, 90, 300, { label: 'ОГОНЬ', value: '0' }, { r0: 3.3, l0: 3.5, l1: K.ogon }, out1, { w: 360, big: 120, index: '01' });
    card(ctx, t, frame, 590, 300, { label: 'СПИРАЛЬ', value: '0' }, { r0: 4.5, l0: 4.8, l1: K.spiral }, out1, { w: 360, big: 120, index: '02' });
    // 2 450 000 000 per second
    card(ctx, t, frame, 110, 270, { label: 'РАЗ В СЕКУНДУ', value: '2 450 000 000', unit: '' }, { r0: 9.3, l0: 9.6, l1: K.sec }, 1 - seg(t, 12.3, 12.7), { w: 860, big: 116, index: '03' });

    // magnetron
    U.targetBox(ctx, T, info.bbox.magnetron, seg(t, K.mag - 0.22, K.mag) * (1 - seg(t, 18.9, 19.3)), { flash: flashAt(t, K.mag), tag: 'МАГНЕТРОН', pad: 20 });
    card(ctx, t, frame, 110, 270, { label: 'ЧАСТОТА ИЗЛУЧЕНИЯ', value: '2.45', unit: 'ГГЦ', detail: 'ИЗЛУЧАЕТ МИКРОВОЛНЫ В КАМЕРУ' }, { r0: 16.2, l0: K.num, l1: K.ghz, d0: 18.3 }, 1 - seg(t, 19.2, 19.6), { w: 600, big: 132, index: '04' });

    // walls reflect
    const wA = win(t, K.walls + 0.4, 24.4, 0.3, 0.3);
    if (wA > 0) {
      const hit = RAYS[0].hits.find(h => h.wall === 'wall' && h.p[0] < MW.cav.x0 + 0.2) || RAYS[0].hits[0];
      const a = pr(hit.p);
      const prog = seg(t, K.walls + 0.4, K.walls + 1.0);
      U.leader(ctx, T, a, [a[0] - 20, 700], [110, 700], prog, { alpha: wA, pulse: (t * 1.2) % 1 });
      labelPlate(ctx, 100, 700, 'МЕТАЛЛ ОТРАЖАЕТ ВОЛНЫ', wA * seg(t, K.walls + 0.8, K.walls + 1.1), 'up');
    }
    // door mesh
    U.targetBox(ctx, T, info.bbox.door, seg(t, K.setka - 0.22, K.setka) * (1 - seg(t, 24.2, 24.6)), { flash: flashAt(t, K.setka), tag: 'СЕТКА ДВЕРЦЫ', pad: 14 });
    const mA = win(t, 24.4, 28.3, 0.45, 0.35);
    if (mA > 0) meshLoupe(ctx, t, frame, mA, pr(MW.door));
    card(ctx, t, frame, 110, 270, { label: 'ДЛИНА ВОЛНЫ', value: '12', unit: 'СМ', detail: 'ОТВЕРСТИЯ СЕТКИ — ОКОЛО 2 ММ' }, { r0: 25.4, l0: 25.7, l1: K.v12, d0: K.dyr + 0.9 }, 1 - seg(t, 28.2, 28.5), { w: 600, big: 132, index: '05' });
  }

  function rays(ctx, pr, tt, a, t) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const v = 1.5, head = tt * v, amp = 0.05;
    RAYS.forEach((R, ri) => {
      const h0 = head - ri * 0.9; if (h0 <= 0) return;
      const n = R.pts.length, i1 = Math.min(n - 1, Math.floor(h0 / R.step)), i0 = Math.max(0, i1 - Math.floor(7 / R.step));
      for (const pass of [0, 1]) {
        ctx.beginPath();
        for (let i = i0; i <= i1; i++) {
          const s = i * R.step, p = R.pts[i];
          const y = p[1] + amp * Math.sin(TAU * (s / LAMBDA) - t * 9);
          const q = pr([p[0], y, p[2]]);
          i === i0 ? ctx.moveTo(q[0], q[1]) : ctx.lineTo(q[0], q[1]);
        }
        ctx.strokeStyle = pass ? T.hi(0.75 * a) : T.line(0.18 * a); ctx.lineWidth = pass ? 1.8 : 9; ctx.stroke();
      }
      for (const h of R.hits) {
        const u = (h0 - h.s) / 0.7; if (u < 0 || u > 1) continue;
        const q = pr(h.p), door = h.wall === 'door' && t > 21.9 && t < 24.4;
        ctx.strokeStyle = T.hi((1 - u) * a * (door ? 1 : 0.7)); ctx.lineWidth = door ? 2.5 : 1.6;
        ctx.beginPath(); ctx.arc(q[0], q[1], 6 + u * (door ? 46 : 26), 0, TAU); ctx.stroke();
      }
    });
    ctx.restore();
  }

  function waterLoupe(ctx, t, frame, a, c, r, from, label) {
    ctx.save();
    const k = eo(a), rr = r * k;
    if (from) U.leader(ctx, T, [from[0], from[1]], [from[0], c[1] + rr + 30], [c[0], c[1] + rr + 30], a, { alpha: a * 0.8 });
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(1,8,12,${0.88 * a})`;
    ctx.beginPath(); ctx.arc(c[0], c[1], rr, 0, TAU); ctx.fill();
    ctx.save(); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const gx = c[0] + ((i % 4) - 1.5) * 58 + (hash(i * 3.1) - 0.5) * 20, gy = c[1] + (Math.floor(i / 4) - 1.5) * 56 + (hash(i * 7.7) - 0.5) * 20;
      const ang = hash(i * 9.1) * TAU + (hash(frame * 1.7 + i * 13.3) - 0.5) * 1.6;
      const jx = (hash(frame * 2.9 + i) - 0.5) * 6, jy = (hash(frame * 4.1 + i) - 0.5) * 6;
      miniMol(ctx, gx + jx, gy + jy, 1.25, ang, a);
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = T.line(0.9 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c[0], c[1], rr, 0, TAU); ctx.stroke();
    ctx.strokeStyle = T.dim(0.6 * a); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 48; i++) { const th = i / 48 * TAU, r2 = rr + (i % 4 ? 6 : 12); ctx.moveTo(c[0] + Math.cos(th) * rr, c[1] + Math.sin(th) * rr); ctx.lineTo(c[0] + Math.cos(th) * r2, c[1] + Math.sin(th) * r2); }
    ctx.stroke();
    ctx.restore();
    labelPlate(ctx, c[0] - rr, c[1] - rr - 14, label, a * seg(a, 0.6, 1), 'up');
  }
  function miniMol(ctx, x, y, s, ang, a) {
    const L = 15 * s, ca = Math.cos(ang), sa = Math.sin(ang);
    const hpos = [-1, 1].map(sg => { const dx = sg * Math.sin(HB / 2) * L, dy = Math.cos(HB / 2) * L; return [x + dx * ca - dy * sa, y + dx * sa + dy * ca]; });
    ctx.strokeStyle = T.line(0.85 * a); ctx.lineWidth = 1.6;
    for (const h of hpos) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(h[0], h[1]); ctx.stroke(); }
    ctx.fillStyle = `rgba(1,8,12,1)`;
    ctx.strokeStyle = T.hi(0.95 * a); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(x, y, 7 * s, 0, TAU); ctx.stroke();
    ctx.strokeStyle = T.line(0.95 * a);
    for (const h of hpos) { ctx.beginPath(); ctx.arc(h[0], h[1], 4.2 * s, 0, TAU); ctx.stroke(); }
  }

  function meshLoupe(ctx, t, frame, a, c) {
    const k = eo(seg(a, 0, 1)), r = 250 * k, cx = 540, cy = c[1] - 10;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.line(0.5 * a); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(cx, cy); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(1,8,12,${0.92 * a})`;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    // mesh: pitch 10 px ≈ 2.5 mm, so one 12 cm wave = 480 px
    const pitch = 10;
    ctx.fillStyle = T.dim(0.55 * a);
    for (let y = cy - r; y < cy + r; y += pitch) for (let x = cx - r; x < cx + r; x += pitch) { ctx.beginPath(); ctx.arc(x + ((y / pitch) % 2 ? pitch / 2 : 0), y, 2.6, 0, TAU); ctx.fill(); }
    const wa = seg(t, K.menshe + 0.3, K.menshe + 1.0);
    if (wa > 0) {
      const lam = 480, A = 92;
      for (const pass of [0, 1]) {
        ctx.beginPath();
        for (let x = cx - r; x <= cx - r + 2 * r * wa; x += 4) { const y = cy - 30 + A * Math.cos(TAU * (x - (cx - lam / 2)) / lam); x === cx - r ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.strokeStyle = pass ? T.hi(0.95 * a) : T.line(0.25 * a); ctx.lineWidth = pass ? 3 : 14; ctx.stroke();
      }
      // λ bracket between two crests
      const lk = seg(t, 25.7, K.v12), yb = cy + 120, xa = cx - lam / 2, xb = cx + lam / 2;
      const locked = t >= K.v12;
      ctx.strokeStyle = locked ? T.acc(0.95 * a) : T.line(0.8 * a); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xa, cy - 30 - A); ctx.lineTo(xa, yb + 14); ctx.moveTo(xb, cy - 30 - A); ctx.lineTo(xb, yb + 14);
      ctx.moveTo(xa, yb); ctx.lineTo(xa + (xb - xa) * eo(lk), yb); ctx.stroke();
      ctx.setLineDash([]);
      if (lk > 0.3) {
        ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(1,8,12,${0.9 * a})`; ctx.fillRect(cx - 120, yb + 18, 240, 50);
        ctx.globalCompositeOperation = 'lighter';
        ctx.font = `600 36px ${U.FONT.ui}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = locked ? (flashAt(t, K.v12) ? T.hi(a) : T.acc(a)) : T.line(0.9 * a);
        ctx.fillText(U.rollText('λ = 12 СМ', clamp((t - 25.7) / (K.v12 - 25.7)), frame, 5), cx, yb + 44);
      }
    }
    // one hole called out
    const ha = seg(t, K.dyr, K.dyr + 0.3);
    if (ha > 0) {
      const hx = cx + 75, hy = cy - 150;
      ctx.strokeStyle = T.hi(0.95 * a * ha); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 9, hy - 6); ctx.lineTo(hx + 40, hy - 36); ctx.lineTo(hx + 60, hy - 36); ctx.stroke();
      ctx.restore(); ctx.save();
      labelPlate(ctx, hx + 62, hy - 36, 'ДЫРОЧКА ≈ 2 ММ', a * ha, 'mid');
    } else ctx.restore();
    ctx.restore();
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = T.line(0.95 * a); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    ctx.strokeStyle = T.dim(0.7 * a); ctx.lineWidth = 1; ctx.beginPath();
    for (let i = 0; i < 72; i++) { const th = i / 72 * TAU + t * 0.2, r2 = r + (i % 6 ? 7 : 15); ctx.moveTo(cx + Math.cos(th) * r, cy + Math.sin(th) * r); ctx.lineTo(cx + Math.cos(th) * r2, cy + Math.sin(th) * r2); }
    ctx.stroke(); ctx.restore();
    labelPlate(ctx, cx - r, cy - r - 18, 'ЛУПА · СЕТКА ДВЕРЦЫ', a * seg(a, 0.6, 1), 'up');
  }

  // ================= Scene B: the water molecule =================
  function molAngle(t) {
    let th = 0;
    th += Math.PI * eio(seg(t, 35.55, 36.85));
    th += Math.PI * eio(seg(t, K.snova1 + 0.15, K.snova1 + 0.75));
    th += Math.PI * eio(seg(t, K.snova2 + 0.15, K.snova2 + 0.7));
    return th + 0.12 * Math.sin(t * 2.3) + 0.05 * Math.sin(t * 7.1);
  }
  const flips = t => (t >= K.flip1) + (t >= K.snova1 + 0.03) + (t >= K.snova2 + 0.01);
  function sceneB(ctx, t, frame, bg) {
    const cam = camB(t);
    if (bg) U.background(ctx, W, H, T, { px: -cam.yaw * 260, py: cam.pitch * 300, cx: 540, cy: 1060 });
    const far = seg(t, 39.0, 40.7);
    const scan = t < 29.6 ? { y: lerp(-0.1, 2.3, sine(seg(t, K.irisA - 0.1, 29.5))), band: 0.08 } : null;
    const scanDown = t >= K.outB ? { y: lerp(6, -3.5, eio(seg(t, K.outB, K.outB + 0.6))) } : null;
    drawPad(ctx, cam, W, H, { hue: HUE, rot: t * 0.12, alpha: (1 - far) * (1 - seg(t, K.outB, K.outB + 0.4)) });
    const th = molAngle(t);
    let info;
    if (t < 39.0) {
      info = holo.draw(ctx, mol, cam, { hue: HUE, scan, angle: { 'w0-o': th, 'w0-h': th, 'w0-b': th }, flash: flashAt(t, 29.33) ? { w0: 1 } : {}, lineWidth: 1.5 });
      if (scan) drawScanPlane(ctx, cam, W, H, scan.y, { hue: HUE, r: 1.15, rot: t * 0.3, alpha: 1 - seg(t, 29.2, 29.6) });
    } else {
      const heat = seg(t, 40.2, K.teplo);
      const ang = {}, ex = {};
      const amp = lerp(0.25, 0.7, seg(t, 39.0, 40.5));
      for (const f of FIELD) {
        const base = f.id === 'w0' ? th : f.ph;
        const a = base + amp * Math.sin(t * 11 * f.sp + f.ph) + (hash(frame * 1.3 + f.ph) - 0.5) * 0.5 * seg(t, K.tolk, K.tolk + 0.5);
        for (const s of ['-o', '-h', '-b']) { ang[f.id + s] = a; ex[f.id + s] = Math.sin(t * 13 * f.sp + f.ph * 3) * seg(t, K.tolk - 0.3, K.tolk + 0.3); }
      }
      const dimO = seg(t, 39.1, 40.2);
      const o = { hue: HUE, angle: ang, explode: ex, focus: 'w0', dim: dimO, scanDown, lineWidth: 1.5 };
      info = holo.draw(ctx, fld, cam, { ...o, alpha: 1 - heat * 0.55 });
      if (heat > 0) holo.draw(ctx, fld, cam, { ...o, flash: allField, alpha: heat * 0.9, focus: null });
      if (scanDown && t < K.outB + 0.6) drawScanPlane(ctx, cam, W, H, scanDown.y, { hue: HUE, r: 3.2, rot: -t * 0.3, alpha: 1 - seg(t, K.outB + 0.4, K.outB + 0.6) });
      // collisions
      const sp = seg(t, K.tolk, K.tolk + 0.3) * (1 - seg(t, K.outB, K.outB + 0.3));
      if (sp > 0) sparks(ctx, info.project, t, frame, sp);
    }
    const P = info.project, p3 = new Float32Array(3);
    const pr = p => { P(p[0], p[1], p[2], p3); return [p3[0], p3[1]]; };
    const molA = 1 - far;
    U.targetBox(ctx, T, info.bbox.w0, seg(t, 29.33 - 0.22, 29.33) * (1 - seg(t, 30.4, 30.8)), { flash: flashAt(t, 29.33), tag: 'H₂O · МОЛЕКУЛА ВОДЫ', pad: 30 });
    // geometry of the rotated molecule on screen
    const c = MOL_C, L = 0.95, rot = (dx, dy) => [c[0] + dx * Math.cos(th) - dy * Math.sin(th), c[1] + dx * Math.sin(th) + dy * Math.cos(th), c[2]];
    const hMid = rot(0, -Math.cos(HB / 2) * L), O = pr(c), Hm = pr(hMid);
    // dipole arrow (− → +)
    const arA = seg(t, K.strelka - 0.1, K.strelka + 0.35) * molA * (1 - seg(t, 39.0, 39.6));
    if (arA > 0) {
      const a0 = pr(rot(0, 0.75)), a1 = pr(rot(0, -1.45));
      arrow(ctx, a0, lerp2(a0, a1, eo(arA)), arA, 5, T.hi);
    }
    // + / − labels
    const pA = seg(t, K.plus, K.plus + 0.25) * molA * (1 - seg(t, 39.0, 39.5));
    const mA = seg(t, K.minus, K.minus + 0.25) * molA * (1 - seg(t, 39.0, 39.5));
    if (pA > 0) signTag(ctx, pr(rot(0, -1.75)), '+', pA, flashAt(t, K.plus));
    if (mA > 0) signTag(ctx, pr(rot(0, 0.95)), '−', mA, flashAt(t, K.minus));
    // field plates
    const fA = seg(t, K.pole, K.pole + 0.4) * (1 - seg(t, 39.0, 39.6));
    if (fA > 0) fieldPlates(ctx, t, fA, flips(t), 440, 1590);
    if (t >= 39.4) fieldPlatesFast(ctx, t, seg(t, 39.4, 39.8) * (1 - seg(t, K.outB, K.outB + 0.3)));
    // temperature
    const tc = seg(t, 40.2, K.teplo), locked = t >= K.teplo;
    if (t > 39.9) {
      const val = String(Math.round(lerp(20, 75, eio(tc))));
      U.specCard(ctx, T, 110, 250, { label: 'ТЕМПЕРАТУРА ЕДЫ', value: val, unit: '°C', detail: 'ТОЛКОТНЯ МОЛЕКУЛ = ТЕПЛО' },
        { reveal: seg(t, 39.9, 40.4), roll: locked ? 1 : 0.999 * seg(t, 40.1, 40.25), detail: seg(t, 41.1, 41.7), frame, flash: flashAt(t, K.teplo) },
        { w: 560, big: 132, index: '06', alpha: 1 - seg(t, K.outB, K.outB + 0.3) });
    }
  }
  const lerp2 = (a, b, k) => [lerp(a[0], b[0], k), lerp(a[1], b[1], k)];
  function arrow(ctx, a, b, al, w, col) {
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l < 4) return;
    const ux = dx / l, uy = dy / l;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    for (const pass of [0, 1]) {
      ctx.strokeStyle = pass ? col(0.95 * al) : T.line(0.25 * al); ctx.lineWidth = pass ? w : w * 4;
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0] - ux * 18, b[1] - uy * 18); ctx.stroke();
    }
    ctx.fillStyle = col(0.95 * al); ctx.beginPath();
    ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] - ux * 34 - uy * 17, b[1] - uy * 34 + ux * 17); ctx.lineTo(b[0] - ux * 34 + uy * 17, b[1] - uy * 34 - ux * 17); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function signTag(ctx, p, s, a, fl) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(1,8,12,${0.9 * a})`;
    ctx.beginPath(); ctx.arc(p[0], p[1], 34, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = fl ? T.hi(a) : T.line(0.9 * a); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(p[0], p[1], 34 * (0.6 + 0.4 * eo(a)), 0, TAU); ctx.stroke();
    ctx.fillStyle = T.hi(a); ctx.font = `700 48px ${U.FONT.ui}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(s, p[0], p[1] + 2);
    ctx.restore();
  }
  function fieldPlates(ctx, t, a, nf, y0, y1) {
    const top = nf % 2 === 0 ? '+' : '−', bot = top === '+' ? '−' : '+';
    const ff = [K.flip1, K.snova1 + 0.03, K.snova2 + 0.01].some(x => flashAt(t, x));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const x0 = 120, x1 = 960;
    for (const [y, s] of [[y0, top], [y1, bot]]) {
      ctx.strokeStyle = ff ? T.hi(a) : T.line(0.85 * a); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * eo(a), y); ctx.stroke();
      ctx.strokeStyle = T.line(0.2 * a); ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + (x1 - x0) * eo(a), y); ctx.stroke();
      ctx.fillStyle = T.hi(0.95 * a); ctx.font = `700 40px ${U.FONT.ui}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < 7; i++) ctx.fillText(s, x0 + 60 + i * 120, y + (y === y0 ? -34 : 36));
    }
    // field arrows: from + to −
    const dn = top === '+';
    for (const x of [175, 905]) {
      for (let k = 0; k < 3; k++) {
        const ya = y0 + 80 + k * 360, yb = ya + 250;
        arrow(ctx, [x, dn ? ya : yb], [x, dn ? yb : ya], a * 0.8, 3, T.line);
      }
    }
    ctx.restore();
    labelPlate(ctx, 120, y0 + 66, 'ЭЛЕКТРИЧЕСКОЕ ПОЛЕ', a, 'down', true);
  }
  function fieldPlatesFast(ctx, t, a) {
    if (a <= 0) return;
    const fast = Math.floor(t * 8) % 2;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const x of [70, 1010]) {
      for (let k = 0; k < 5; k++) {
        const ya = 620 + k * 230, yb = ya + 150;
        arrow(ctx, [x, fast ? ya : yb], [x, fast ? yb : ya], a * 0.7, 3, T.line);
      }
    }
    ctx.restore();
  }
  function sparks(ctx, P, t, frame, a) {
    const p3 = new Float32Array(3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < FIELD.length; i++) for (let j = i + 1; j < FIELD.length; j++) {
      const A = FIELD[i].c, B = FIELD[j].c, d = Math.hypot(A[0] - B[0], A[1] - B[1]);
      if (d > 3.3) continue;
      const ph = hash(i * 17 + j * 31), u = ((t * 1.7 + ph) % 1);
      if (u > 0.18) continue;
      P((A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2, p3);
      const k = 1 - u / 0.18, r = 8 + 40 * (1 - k);
      ctx.strokeStyle = T.hi(a * k); ctx.lineWidth = 2;
      ctx.beginPath();
      for (let q = 0; q < 6; q++) { const th = q / 6 * TAU + ph * 3; ctx.moveTo(p3[0] + Math.cos(th) * r * 0.4, p3[1] + Math.sin(th) * r * 0.4); ctx.lineTo(p3[0] + Math.cos(th) * r, p3[1] + Math.sin(th) * r); }
      ctx.stroke();
    }
    ctx.restore();
  }

  // ================= Scene C: food cross-section on the turntable =================
  const heatOf = (k, t) => {
    let h = 0;
    if (k === 0) h = seg(t, 44.3, 45.4);
    if (k === 1) h = 0.55 * seg(t, 44.6, 45.6);
    const d = seg(t, 46.6 + (k - 1) * 0.45, 47.8 + (k - 1) * 0.5) * (0.85 - k * 0.07);
    h = Math.max(h, d);
    const st = seg(t, K.pomesh, K.pomesh + 0.7);
    return lerp(h, 0.9, st);
  };
  const hex = h => { const c = [lerp(0x30, 0xff, h), lerp(0xd8, 0xff, h), lerp(0xe6, 0xff, h)].map(v => Math.round(clamp(v / 255) * 255).toString(16).padStart(2, '0')); return '#' + c.join(''); };
  function sceneC(ctx, t, frame) {
    const cam = camC(t);
    const scan = t < K.inC + 1.1 ? { y: lerp(-0.1, 1.0, sine(seg(t, K.inC, K.inC + 1.05))), band: 0.06 } : null;
    const scanDown = t >= K.outC ? { y: lerp(1.0, -0.1, eio(seg(t, K.outC, K.outC + 0.6))) } : null;
    drawPad(ctx, cam, W, H, { hue: HUE, rot: t * 0.12, alpha: seg(t, K.inC, K.inC + 0.4) * (1 - seg(t, K.outC + 0.2, K.outC + 0.6)) });
    const ts = Math.max(0, t - K.tarelka), spin = 1.1 * (ts - 0.35 * (1 - Math.exp(-ts / 0.35)));
    const keep = {};
    for (let k = 0; k < FOOD.n; k++) { const h = heatOf(k, t); if (h > 0.02) keep['f' + k + 'p'] = hex(h); }
    const rings = Array.from({ length: FOOD.n }, (_, k) => 'f' + k);
    const info = holo.draw(ctx, food, cam, { hue: HUE, scan, scanDown, spin, only: ['plate', 'bowl'], scanOffset: t * 24, lineWidth: 1.4, gain: 0.8 });
    holo.draw(ctx, food, cam, { hue: HUE, scan, scanDown, keep, spin, only: rings, solid: 1, scanOffset: t * 24, lineWidth: 1.5 });
    if (scan) drawScanPlane(ctx, cam, W, H, scan.y, { hue: HUE, r: 1.5, rot: t * 0.3, alpha: 1 - seg(t, K.inC + 0.8, K.inC + 1.1) });
    if (scanDown && t < K.outC + 0.6) drawScanPlane(ctx, cam, W, H, scanDown.y, { hue: HUE, r: 1.5, rot: -t * 0.3, alpha: 1 - seg(t, K.outC + 0.4, K.outC + 0.6) });
    const P = info.project, p3 = new Float32Array(3);
    const pr = p => { P(p[0], p[1], p[2], p3); return [p3[0], p3[1]]; };
    const hudA = 1 - seg(t, K.outC - 0.1, K.outC + 0.2);
    // waves coming down into the food
    const wA = seg(t, K.volny, K.volny + 0.3) * (1 - seg(t, 46.2, 46.7));
    if (wA > 0) foodWaves(ctx, pr, t, wA);
    // penetration bracket on the right edge of the surface
    const bA = seg(t, 44.9, 45.3) * (1 - seg(t, 49.6, 50.0));
    if (bA > 0) {
      const top = FOOD.top + 0.002, R = FOOD.R;
      const a = pr([R, top, 0]), b = pr([R * (1 - 1.5 / 6), top, 0]);
      const locked = t >= K.cm, y = Math.min(a[1], b[1]) - 70;
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = locked ? T.acc(bA) : T.line(0.9 * bA); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a[0], a[1] - 8); ctx.lineTo(a[0], y - 10); ctx.moveTo(b[0], b[1] - 8); ctx.lineTo(b[0], y - 10); ctx.moveTo(a[0], y); ctx.lineTo(b[0], y); ctx.stroke();
      ctx.restore();
      labelPlate(ctx, b[0] - 40, y - 22, '1–2 СМ', bA, 'up', false, locked ? (flashAt(t, K.cm) ? 'hi' : 'acc') : null);
    }
    card(ctx, t, frame, 110, 270, { label: 'ВОЛНЫ ПРОНИКАЮТ', value: '1–2', unit: 'СМ', detail: 'ДАЛЬШЕ ТЕПЛО ИДЁТ ОТ КРАЁВ' }, { r0: 44.4, l0: 44.8, l1: K.cm, d0: K.kraev - 0.4 }, 1 - seg(t, 50.0, 50.4), { w: 600, big: 132, index: '07' });
    // centre heats from the edges: inward arrows
    const iA = seg(t, K.seredina + 0.3, K.seredina + 0.7) * (1 - seg(t, K.pomesh - 0.2, K.pomesh + 0.2));
    if (iA > 0) {
      for (let i = 0; i < 6; i++) {
        const th = i / 6 * TAU + 0.3, r0 = 0.85, r1 = 0.85 - 0.5 * eo(seg(t, K.seredina + 0.3 + i * 0.05, 48.6));
        arrow(ctx, pr([Math.cos(th) * r0, FOOD.top, Math.sin(th) * r0]), pr([Math.cos(th) * r1, FOOD.top, Math.sin(th) * r1]), iA * 0.9, 3, T.hi);
      }
      const c = pr([0, FOOD.top, 0]);
      labelPlate(ctx, c[0] - 130, c[1] - 260, 'СЕРЕДИНА ГРЕЕТСЯ ОТ КРАЁВ', iA, 'up');
    }
    // stir
    const sA = win(t, K.pomesh - 0.1, 50.6, 0.25, 0.3);
    if (sA > 0) {
      const c = pr([0, FOOD.top, 0]), k = seg(t, K.pomesh, K.pomesh + 0.8);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.hi(0.9 * sA); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(c[0], c[1], 210, 210 * Math.sin(0.66), 0, -0.5 + k * 4, -0.5 + k * 4 + 4.2); ctx.stroke(); ctx.restore();
      labelPlate(ctx, c[0] - 100, c[1] - 260, 'ПОМЕШАТЬ', sA, 'up');
    }
    // turntable: fixed hot spots + painted arcs
    const tA = seg(t, K.tarelka - 0.1, K.tarelka + 0.3) * hudA;
    if (tA > 0) {
      const spots = [[0.62, 0.9], [0.35, 3.3], [0.82, 4.6]];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      for (const [r, th] of spots) {
        const q = pr([Math.cos(th) * r, FOOD.top + 0.01, Math.sin(th) * r]);
        const g = ctx.createRadialGradient(q[0], q[1], 0, q[0], q[1], 60);
        g.addColorStop(0, T.hi(0.7 * tA)); g.addColorStop(1, T.hi(0));
        ctx.fillStyle = g; ctx.fillRect(q[0] - 60, q[1] - 60, 120, 120);
        const sweep = Math.min(TAU, spin);
        ctx.strokeStyle = T.hi(0.55 * tA); ctx.lineWidth = 3; ctx.beginPath();
        for (let i = 0; i <= 64; i++) { const a = th - sweep * i / 64, p = pr([Math.cos(a) * r, FOOD.top + 0.01, Math.sin(a) * r]); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
        ctx.stroke();
      }
      ctx.restore();
      const q = pr([Math.cos(0.9) * 0.62, FOOD.top, Math.sin(0.9) * 0.62]);
      U.leader(ctx, T, q, [q[0] + 60, 640], [880, 640], seg(t, K.tarelka + 0.2, K.tarelka + 0.8), { alpha: tA });
      labelPlate(ctx, 600, 640, 'ГОРЯЧИЕ ТОЧКИ', tA * seg(t, K.tarelka + 0.6, K.tarelka + 0.9), 'up');
      const pl = pr([0, 0.02, 1.45]);
      U.leader(ctx, T, pl, [pl[0] - 80, 1560], [160, 1560], seg(t, K.tarelka + 0.5, K.tarelka + 1.1), { alpha: tA });
      labelPlate(ctx, 150, 1560, 'ТАРЕЛКА КРУТИТСЯ', tA * seg(t, K.tarelka + 0.9, K.tarelka + 1.2), 'up');
    }
  }
  function foodWaves(ctx, pr, t, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const R = FOOD.R, top = FOOD.top;
    for (let i = 0; i < 7; i++) {
      const th = lerp(-0.25, Math.PI + 0.25, i / 6), ex = [Math.cos(th) * R * 0.97, top, Math.sin(th) * R * 0.97];
      const st = [Math.cos(th) * 1.9, top + 1.0, Math.sin(th) * 1.9];
      const inn = [Math.cos(th) * R * 0.72, top - 0.02, Math.sin(th) * R * 0.72];
      const prog = ((t - K.volny) / 1.1 + i * 0.13) % 1.0 * 0.999 + 0.001;
      for (const pass of [0, 1]) {
        ctx.beginPath();
        const N = 60;
        for (let j = Math.max(0, Math.floor(N * (prog - 0.45))), j0 = j; j <= N * prog; j++) {
          const u = j / N, p = u < 0.8 ? [lerp(st[0], ex[0], u / 0.8), lerp(st[1], ex[1], u / 0.8), lerp(st[2], ex[2], u / 0.8)] : [lerp(ex[0], inn[0], (u - 0.8) / 0.2), top, lerp(ex[2], inn[2], (u - 0.8) / 0.2)];
          const ampW = u < 0.8 ? 0.07 : 0.07 * (1 - (u - 0.8) / 0.2);
          const q = pr([p[0], p[1] + ampW * Math.sin(u * 40 - t * 10), p[2]]);
          j > j0 ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
        }
        ctx.strokeStyle = pass ? T.hi(0.8 * a) : T.line(0.2 * a); ctx.lineWidth = pass ? 2 : 10; ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ================= Scene D: summary =================
  function sceneD(ctx, t, frame) {
    const cam = camD(t);
    drawPad(ctx, cam, W, H, { hue: HUE, rot: t * 0.12, alpha: seg(t, K.inD, K.inD + 0.4) * (1 - seg(t, K.outD + 0.8, K.outD + 1.4) * 0.7) });
    const scan = t < K.inD + 1.2 ? { y: lerp(-0.02, 1.08, sine(seg(t, K.inD, K.inD + 1.15))), band: 0.06 } : null;
    const scanDown = t >= K.outD ? { y: lerp(1.1, -0.05, eio(seg(t, K.outD, K.outD + 1.3))) } : null;
    const flash = {};
    if (flashAt(t, K.voda2)) flash.bowl = 1;
    if (flashAt(t, K.ding)) { flash.door = 1; flash.panel = 1; }
    const heat = seg(t, K.voda2, K.voda2 + 0.8) * (1 - seg(t, K.outD, K.outD + 0.3));
    const info = holo.draw(ctx, mw, cam, { hue: HUE, scan, scanDown, flash, scanOffset: t * 24,
      wave: heat > 0 ? { y: MW.bowl[1] + 0.02 + 0.03 * Math.sin(t * 9), w: 0.06 * heat } : null });
    if (scan) drawScanPlane(ctx, cam, W, H, scan.y, { hue: HUE, r: 1.1, rot: t * 0.3, alpha: 1 - seg(t, K.inD + 0.9, K.inD + 1.2) });
    if (scanDown && t < K.outD + 1.4) drawScanPlane(ctx, cam, W, H, scanDown.y, { hue: HUE, r: 1.1, rot: -t * 0.3, alpha: 1 - seg(t, K.outD + 1.1, K.outD + 1.4) });
    const hudA = 1 - seg(t, K.outD, K.outD + 0.5);
    const chips = [
      [K.ogon2 - 0.25, { label: 'ОГОНЬ', value: '0', unit: '' }],
      [K.spiral2 - 0.25, { label: 'СПИРАЛЬ', value: '0', unit: '' }],
      [K.voda2 + 0.3, { label: 'ЧАСТОТА', value: '2.45', unit: 'ГГЦ' }],
      [56.9, { label: 'ВОЛНА', value: '12', unit: 'СМ' }],
    ];
    chips.forEach(([t0, c], i) => {
      const a = seg(t, t0, t0 + 0.25) * hudA;
      if (a > 0) U.chip(ctx, T, i % 2 ? 580 : 100, 270 + Math.floor(i / 2) * 120, c, a, { w: 400, index: '0' + (i + 1) });
    });
    U.targetBox(ctx, T, info.bbox.bowl, seg(t, K.voda2 - 0.22, K.voda2) * hudA, { flash: flashAt(t, K.voda2), tag: 'ВОДА', pad: 16 });
    const lA = win(t, K.voda2 + 0.1, K.outD + 0.3, 0.35, 0.4);
    if (lA > 0) waterLoupe(ctx, t, frame, lA, [540, 700], 120, info.anchor.bowl, 'НЕ СТОИТ НА МЕСТЕ');
    // ding
    if (t >= K.ding && t < K.ding + 0.8) {
      const u = seg(t, K.ding, K.ding + 0.8), p = info.anchor.panel;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.hi(1 - u); ctx.lineWidth = 2.5;
      for (const k of [0, 0.25]) { const r = 20 + 160 * clamp(u - k); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.stroke(); }
      ctx.restore();
    }
    // closing title
    const tl = seg(t, K.title, K.title + 0.5);
    if (tl > 0) {
      ctx.save();
      ctx.font = `600 64px ${U.FONT.ui}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '6px';
      const s1 = U.rollText('МИКРОВОЛНОВКА', tl, frame, 2), s2 = 'ВСЁ ДЕЛО В ВОДЕ';
      U.plate(ctx, T, 110, 860, 860, 210, tl);
      ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = T.hi(0.96 * tl); ctx.fillText(s1, 540, 935);
      ctx.font = `500 34px ${U.FONT.ui}`; ctx.letterSpacing = '4px'; ctx.fillStyle = T.line(0.9 * seg(t, K.title + 0.4, K.title + 0.8));
      ctx.fillText(s2, 540, 1010);
      ctx.restore();
    }
  }

  // ---------- Shared UI ----------
  function card(ctx, t, frame, x, y, c, s, out, o) {
    if (t < s.r0 || out <= 0) return;
    U.specCard(ctx, T, x, y, c, {
      reveal: seg(t, s.r0, s.r0 + 0.45), roll: seg(t, s.l0, s.l1), detail: s.d0 ? seg(t, s.d0, s.d0 + 0.6) : 0, frame, flash: flashAt(t, s.l1),
    }, { ...o, alpha: out });
  }
  function labelPlate(ctx, x, y, text, a, anchor = 'up', big = false, col = null) {
    if (a <= 0) return;
    ctx.save();
    ctx.font = `600 ${big ? 26 : 28}px ${U.FONT.ui}`; ctx.letterSpacing = '2px';
    const w = ctx.measureText(text).width + 28, h = 44;
    const yy = anchor === 'up' ? y - h : anchor === 'mid' ? y - h / 2 : y;
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(1,8,12,${0.86 * a})`; ctx.fillRect(x, yy, w, h);
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.line(0.6 * a); ctx.lineWidth = 1.2; ctx.strokeRect(x + .5, yy + .5, w - 1, h - 1);
    ctx.fillStyle = col === 'acc' ? T.acc(a) : col === 'hi' ? T.hi(a) : T.hi(0.95 * a);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 14, yy + h / 2 + 1);
    ctx.restore();
  }
  function hudChrome(ctx, t, frame) {
    const sc = t < K.irisA + 0.3 ? 1 : t < K.inC + 0.2 ? 2 : t < K.inD + 0.2 ? 3 : 4;
    const name = ['', 'МИКРОВОЛНОВКА', 'МОЛЕКУЛА ВОДЫ', 'ЕДА · РАЗРЕЗ', 'СВОДКА'][sc];
    const tc = `T+${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(2).padStart(5, '0')}`;
    const a = clamp(t * 3) * (1 - seg(t, DUR - 0.6, DUR - 0.1));
    U.chrome(ctx, W, H, U.theme(HUE, ACC), { tl: `ОБЪЕКТ 0${sc} · ${name}`, tr: tc, bl: `КАДР ${String(frame).padStart(4, '0')}`, br: `СЦЕНА 0${sc}/04`, alpha: a });
  }
  function subs(ctx, t) {
    for (const [a, b, s] of CUES) if (t >= a - 0.05 && t < b) {
      const al = seg(t, a - 0.05, a + 0.1) * (1 - seg(t, b - 0.1, b));
      U.subtitle(ctx, W, H, T, s, al, { y: H - 160, maxW: 840, t });
    }
  }

  return { render, DUR, EV, CUES };
}
