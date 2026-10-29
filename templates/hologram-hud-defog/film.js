// "Запотевают стёкла зимой" · hologram-hud, 1080×1920, 24 fps. Times are absolute seconds (voice starts at 0.30).
// Platform safe box: everything readable stays inside x 70–930, y 230–1480.
import { Holo, drawScanPlane, drawPad, makeCamera } from './engine/holo.js';
import * as U from './engine/hud.js';
import { car, hvac, WS, wsPoint, CAR, HV, PATH } from './models.js';
const { clamp } = U;
const W = 1080, H = 1920, TAU = Math.PI * 2;
const SAFE = { x0: 70, x1: 930, y0: 230, y1: 1480 };
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eo = t => 1 - Math.pow(1 - clamp(t), 3);
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const sine = t => 0.5 - 0.5 * Math.cos(Math.PI * clamp(t));
const hash = n => { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };
const win = (t, a, b, fi = 0.3, fo = 0.3) => seg(t, a, a + fi) * (1 - seg(t, b - fo, b));
const FL = 3 / 24;
const flashAt = (t, tl) => t >= tl && t < tl + FL;
const rhoS = T => 216.7 * 6.112 * Math.exp(17.67 * T / (T + 243.5)) / (T + 273.15);   // saturation vapour, g/m³

const HUE = 196, ACC = 32;
export const CUES = [
  [0.30, 3.40, 'Запотевшие стёкла зимой — это не мороз снаружи.'],
  [3.50, 5.55, 'Это вода из вашего дыхания.'],
  [5.64, 8.75, 'За час человек выдыхает около столовой ложки воды,'],
  [8.86, 10.70, 'а ещё тает снег на ботинках.'],
  [10.80, 13.20, 'В тёплом воздухе этот пар невидим.'],
  [13.28, 15.62, 'Но у ледяного стекла воздух остывает,'],
  [15.68, 18.60, 'а холодный воздух удерживает в разы меньше влаги.'],
  [18.74, 22.70, 'При +20 °C и обычной влажности порог — около +9 °C.'],
  [23.02, 24.45, 'Это точка росы.'],
  [24.58, 26.55, 'Стекло холоднее — и лишняя вода'],
  [26.64, 28.88, 'оседает на нём миллионами крошечных капель.'],
  [28.94, 30.25, 'Что делать?'],
  [30.38, 32.40, 'Первое — выключите рециркуляцию.'],
  [32.50, 34.90, 'Она гоняет по кругу ваш же влажный воздух.'],
  [35.04, 37.10, 'Включите забор воздуха с улицы.'],
  [37.24, 39.10, 'Морозный воздух почти сухой:'],
  [39.24, 40.65, 'нагрейте его до +20 °C —'],
  [40.74, 43.70, 'и влажность упадёт примерно до 10 %.'],
  [43.84, 46.90, 'Второе — включите кондиционер, даже зимой.'],
  [47.00, 49.30, 'Воздух проходит через холодный испаритель,'],
  [49.38, 51.75, 'влага оседает на нём и стекает наружу,'],
  [51.84, 53.95, 'а печка нагревает уже сухой воздух.'],
  [54.12, 57.40, 'Третье — обдув лобового стекла, вентилятор на максимум.'],
  [57.52, 59.95, 'Тёплый поток поднимает температуру стекла'],
  [60.02, 62.45, 'выше точки росы, и капли испаряются.'],
  [62.66, 64.85, 'В сильный мороз кондиционер может не включиться —'],
  [64.95, 67.40, 'тогда главную работу делает свежий воздух.'],
  [67.68, 69.40, 'И не протирайте стекло рукой:'],
  [69.48, 71.95, 'жирные разводы потом запотевают ещё быстрее.'],
  [72.26, 74.25, 'Сухой воздух и тёплое стекло —'],
  [74.32, 76.40, 'и через минуту снова видно дорогу.'],
];
const K = {
  ws: 1.9, voda: 3.80, lozhki: 7.80, sneg: 9.58, par: 12.44,
  ledyan: 13.94, ostyv: 14.90, menshe: 17.56, plus20: 19.14, plus9: 21.88, rosy: 23.80, steklo: 24.58, osedaet: 26.64,
  outA: 28.90, inC: 29.15, recirc: 31.38, krugu: 33.28, vkl: 35.04, ulicy: 36.48, suhoi: 38.32, desyati: 42.58,
  cond: 45.10, isparitel: 48.56, vlaga: 49.38, naruzhu: 51.08, pechka: 52.00, suhoiV: 53.00, outC: 53.95,
  inD: 54.15, obduv: 54.94, maks: 57.12, rosy2: 60.64, kapli: 61.30, moroz: 62.66, ne_vkl: 64.36, svezh: 66.64,
  ruka: 68.86, razvody: 69.48, suhoiEnd: 72.26, dorogu: 75.46, outD: 76.45, title: 77.45,
};
export const DUR = 79.4;

// ---------- Sound events ----------
const EV = [];
const ev = (t, k, o = {}) => EV.push({ t: +t.toFixed(3), k, ...o });
ev(0, 'scan', { d: 2.4 }); ev(K.ws - 0.2, 'lock'); ev(1.0, 'fog', { d: 12 });
ev(K.voda - 0.2, 'lock'); ev(K.voda + 0.1, 'breath'); ev(K.voda + 2.7, 'breath'); ev(K.voda + 5.3, 'breath'); ev(K.voda + 7.9, 'breath');
ev(6.0, 'roll', { d: K.lozhki - 6.0 }); ev(K.lozhki, 'confirm'); ev(K.sneg - 0.2, 'lock');
ev(13.1, 'whoosh', { d: 1.1 }); ev(13.4, 'iris'); ev(13.9, 'tick'); ev(17.0, 'tick'); ev(17.2, 'tick');
ev(19.0, 'slide', { d: 2.9 }); ev(K.plus9, 'confirm'); ev(K.rosy, 'tick'); ev(24.7, 'slide', { d: 1.6 }); ev(K.osedaet, 'drops', { d: 2.2 });
ev(K.outA, 'scanDown', { d: 0.6 }); ev(K.inC, 'scan', { d: 1.1 }); ev(K.inC + 0.2, 'fanOn');
ev(30.6, 'roll', { d: 1.3 }); ev(31.9, 'confirm'); ev(32.6, 'zip'); ev(K.vkl + 0.05, 'servo', { d: 0.7 }); ev(35.75, 'lock');
ev(K.ulicy, 'tick'); ev(41.2, 'roll', { d: K.desyati - 41.2 }); ev(K.desyati, 'confirm');
ev(44.6, 'roll', { d: K.cond - 44.6 }); ev(K.cond, 'confirm'); ev(K.isparitel - 0.2, 'lock'); ev(K.vlaga, 'drops', { d: 2.0 }); ev(K.naruzhu, 'drip');
ev(K.pechka - 0.2, 'lock'); ev(K.pechka, 'warm', { d: 1.6 });
ev(K.outC, 'scanDown', { d: 0.6 }); ev(K.inD, 'scan', { d: 1.1 }); ev(K.obduv, 'whoosh', { d: 1.5 }); ev(55.4, 'roll', { d: K.maks - 55.4 }); ev(K.maks, 'confirm'); ev(K.maks, 'fanMax');
ev(58.75, 'whoosh', { d: 0.4 }); ev(59.1, 'roll', { d: K.rosy2 - 59.1 }); ev(K.rosy2, 'confirm'); ev(K.kapli - 0.5, 'clear', { d: 2.4 });
ev(63.2, 'warn'); ev(K.svezh - 0.2, 'lock'); ev(67.7, 'iris'); ev(K.ruka, 'warn');
ev(72.3, 'tick'); ev(72.8, 'tick'); ev(73.3, 'tick'); ev(73.8, 'tick'); ev(K.dorogu - 0.2, 'confirm', { v: 0.7 });
ev(K.outD, 'fanOff'); ev(K.outD, 'scanDown', { d: 1.2 }); ev(K.title, 'confirm', { v: 0.6 });

// ---------- Cameras ----------
const C = o => ({ fov: 0.6, cx: 500, roll: 0, ...o });
const mixCam = (A, B, w) => ({
  ...A, target: A.target.map((x, i) => lerp(x, B.target[i], w)), yaw: lerp(A.yaw, B.yaw, w), pitch: lerp(A.pitch, B.pitch, w),
  dist: Math.exp(lerp(Math.log(A.dist), Math.log(B.dist), w)), cx: lerp(A.cx, B.cx, w), cy: lerp(A.cy, B.cy, w),
});
const wsC = wsPoint(0.5, 0.5, 0);
const CAM = {
  a0: C({ target: [0.12, 0.42, 0], yaw: Math.PI - 0.62, pitch: 0.30, dist: 7.7, cy: 930 }),
  a1: C({ target: [0.12, 0.42, 0], yaw: Math.PI - 0.50, pitch: 0.28, dist: 7.4, cy: 930 }),
  ws: C({ target: [wsC[0] - 0.05, wsC[1] - 0.05, wsC[2]], yaw: Math.PI - 0.40, pitch: 0.36, dist: 4.9, cy: 1080 }),
  hv: C({ target: [-0.4, 1.05, 0], yaw: 0.24, pitch: 0.12, dist: 11.3, cy: 960 }),
  hv2: C({ target: [-0.36, 1.05, 0], yaw: 0.10, pitch: 0.08, dist: 11.0, cy: 960 }),
  d0: C({ target: [0.18, 0.45, 0], yaw: Math.PI - 0.45, pitch: 0.30, dist: 7.3, cy: 940 }),
  d1: C({ target: [0.12, 0.42, 0], yaw: Math.PI - 0.66, pitch: 0.30, dist: 7.8, cy: 950 }),
};
function camCar(t) {
  if (t < 13.0) return mixCam(CAM.a0, CAM.a1, sine(seg(t, 0, 13)));
  return mixCam(CAM.a1, CAM.ws, eio(seg(t, 13.0, 14.4)));
}
const camHV = t => mixCam(CAM.hv, CAM.hv2, sine(seg(t, K.inC, K.outC + 0.6)));
const camD = t => mixCam(CAM.d0, CAM.d1, sine(seg(t, K.inD, DUR)));

// ---------- Fog droplets on the windshield ----------
const DROPS = Array.from({ length: 1700 }, (_, i) => ({ u: hash(i * 1.37), v: hash(i * 7.91), r: 0.8 + 2.6 * Math.pow(hash(i * 3.3), 2.5), th: hash(i * 5.1) }));
function fogLevel(t) {
  let f = 0.85 * seg(t, 1.0, 12.0) + 0.15 * seg(t, K.osedaet, K.osedaet + 2);
  if (t >= K.inD) f = 1;
  return f;
}
const clearFront = t => t < K.inD ? -1 : lerp(-0.05, 1.1, eio(seg(t, K.kapli - 1.6, K.kapli + 0.9)));

export function makeFilm() {
  const T = U.theme(HUE, ACC);
  const mcar = car(), mhv = hvac();
  const holo = new Holo(W, H);
  const P3 = new Float32Array(3);

  function render(ctx, t) {
    const frame = Math.round(t * 24);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    const inA = t < K.outA + 0.6, inC = t >= K.inC && t < K.outC + 0.6, inD = t >= K.inD;
    const cam = inD ? camD(t) : inC && t > K.outA + 0.3 ? camHV(t) : camCar(t);
    U.background(ctx, W, H, T, { px: -cam.yaw * 260, py: cam.pitch * 300, cx: 500, cy: 900 });
    if (inA) sceneCar(ctx, t, frame);
    if (inC) sceneHV(ctx, t, frame);
    if (inD) sceneD(ctx, t, frame);
    U.vignette(ctx, W, H, 0.5);
    chrome(ctx, t, frame);
    subs(ctx, t);
  }

  // ================= Car: hook + physics =================
  function sceneCar(ctx, t, frame) {
    const cam = camCar(t);
    drawPad(ctx, cam, W, H, { hue: HUE, rot: t * 0.1, alpha: clamp(0.3 + t * 0.6) * (1 - seg(t, K.outA, K.outA + 0.5)) });
    const scan = t < 2.5 ? { y: lerp(-0.02, 0.85, sine(seg(t, 0, 2.4))), band: 0.05 } : null;
    const scanDown = t >= K.outA ? { y: lerp(0.85, -0.05, eio(seg(t, K.outA, K.outA + 0.6))) } : null;
    const phys = seg(t, 13.0, 13.6);
    const flash = {};
    if (flashAt(t, K.ws)) flash.windshield = 1;
    if (flashAt(t, K.voda)) flash.driver = 1;
    if (flashAt(t, K.sneg)) flash.boots = 1;
    const info = holo.draw(ctx, mcar, cam, { hue: HUE, scan, scanDown, flash, focus: phys > 0 ? 'windshield' : null, dim: lerp(1, 0.32, phys), solid: 0.12, scanOffset: t * 24 });
    if (scan) drawScanPlane(ctx, cam, W, H, scan.y, { hue: HUE, r: 1.5, rot: t * 0.3, alpha: 1 - seg(t, 2.1, 2.5) });
    if (scanDown && t < K.outA + 0.6) drawScanPlane(ctx, cam, W, H, scanDown.y, { hue: HUE, r: 1.5, rot: -t * 0.3, alpha: 1 - seg(t, K.outA + 0.4, K.outA + 0.6) });
    const P = info.project, pr = p => { P(p[0], p[1], p[2], P3); return [P3[0], P3[1]]; };
    const visA = scanDown ? 1 - seg(t, K.outA, K.outA + 0.4) : seg(t, 0.8, 2.4);
    fog(ctx, pr, t, fogLevel(t) * visA, -1);

    // hook tags
    const hA = 1 - seg(t, 12.9, 13.3);
    U.targetBox(ctx, T, info.bbox.windshield, seg(t, K.ws - 0.22, K.ws) * (1 - seg(t, 5.2, 5.6)), { flash: flashAt(t, K.ws), tag: 'СТЕКЛО ЗАПОТЕВАЕТ', pad: 14 });
    if (t > 2.4 && t < 5.6) labelPlate(ctx, 100, 1170, 'СНАРУЖИ −10 °C · ДЕЛО НЕ В НЁМ', win(t, 2.4, 5.6), 'up');
    U.targetBox(ctx, T, info.bbox.driver, seg(t, K.voda - 0.22, K.voda) * hA, { flash: flashAt(t, K.voda), tag: 'ДЫХАНИЕ', pad: 12 });
    if (t > K.voda && t < 13.6) breath(ctx, pr, t, hA);
    card(ctx, t, frame, 100, 290, { label: 'ВОДЫ ЗА ЧАС С ДЫХАНИЕМ', value: '≈15', unit: 'Г', detail: 'ОКОЛО СТОЛОВОЙ ЛОЖКИ' }, { r0: 5.7, l0: 6.0, l1: K.lozhki, d0: 7.4 }, 1 - seg(t, 12.6, 13.0), { w: 560, big: 132, index: '01' });
    U.targetBox(ctx, T, info.bbox.boots, seg(t, K.sneg - 0.22, K.sneg) * hA, { flash: flashAt(t, K.sneg), tag: 'СНЕГ НА ОБУВИ', pad: 14 });
    if (t > K.sneg) steam(ctx, pr, CAR.boot, t - K.sneg, hA * 0.9, 1);
    const invA = win(t, 10.8, 13.3, 0.4, 0.3);
    if (invA > 0) {
      cabinVapour(ctx, pr, t, invA);
      labelPlate(ctx, 100, 600, 'САЛОН +20 °C · ПАР НЕВИДИМ', invA, 'up');
    }

    // physics: chart + glass loupe
    const gA = seg(t, 13.2, 13.8) * (1 - seg(t, K.outA - 0.3, K.outA + 0.1));
    if (gA > 0) chart(ctx, t, frame, gA);
    const lA = seg(t, 13.5, 14.0) * (1 - seg(t, K.outA - 0.3, K.outA + 0.1));
    if (lA > 0) glassLoupe(ctx, t, frame, lA, pr(wsPoint(0.3, 0.55)));
  }

  function fog(ctx, pr, t, lvl, front, smear = null) {
    if (lvl <= 0.01) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    // milky sheet
    const q = [wsPoint(0, 0), wsPoint(1, 0), wsPoint(1, 1), wsPoint(0, 1)].map(pr);
    const vf = Math.max(0, front);
    const qa = [wsPoint(0, vf), wsPoint(1, vf), wsPoint(1, 1), wsPoint(0, 1)].map(pr);
    ctx.beginPath(); qa.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
    ctx.fillStyle = T.hi(0.16 * lvl); ctx.fill();
    for (const d of DROPS) {
      if (d.th > lvl || d.v < front) continue;
      const p = pr(wsPoint(d.u, d.v));
      const edge = d.v < front + 0.06 ? (d.v - front) / 0.06 : 1;
      ctx.fillStyle = T.hi((0.35 + 0.4 * d.r / 3.4) * Math.min(1, (lvl - d.th) * 6) * edge);
      ctx.beginPath(); ctx.arc(p[0], p[1], d.r * (0.6 + 0.4 * lvl), 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function breath(ctx, pr, t, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const m = CAR.mouth;
    for (let b = 0; b < 4; b++) {
      const t0 = K.voda + 0.1 + b * 2.6, u = (t - t0) / 1.6;
      if (u < 0 || u > 1) continue;
      for (let i = 0; i < 26; i++) {
        const tg = wsPoint(0.15 + 0.4 * hash(i * 3.7 + b), 0.25 + 0.6 * hash(i * 9.3 + b));
        const k = eo(u * (0.8 + 0.4 * hash(i * 1.9)));
        const p = pr([lerp(m[0], tg[0], k), lerp(m[1], tg[1], k) + Math.sin(k * 3 + i) * 0.02, lerp(m[2], tg[2], k)]);
        ctx.fillStyle = T.line(0.75 * a * Math.sin(Math.PI * clamp(u)));
        ctx.beginPath(); ctx.arc(p[0], p[1], 2.2 + 2 * k, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }
  function steam(ctx, pr, c, tt, a, n) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 18 * n; i++) {
      const life = ((tt * 0.45 + hash(i * 4.1)) % 1), x = c[0] + (hash(i * 7.3) - 0.5) * 0.12, z = c[2] + (hash(i * 2.9) - 0.5) * 0.12;
      const p = pr([x + Math.sin(life * 5 + i) * 0.02, c[1] + life * 0.35, z]);
      ctx.fillStyle = T.line(0.6 * a * Math.sin(Math.PI * life)); ctx.beginPath(); ctx.arc(p[0], p[1], 2 + life * 3, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function cabinVapour(ctx, pr, t, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const x = lerp(-0.7, 0.45, hash(i * 1.1)) + 0.03 * Math.sin(t * 1.3 + i), y = lerp(0.35, 0.74, hash(i * 2.3)) + 0.02 * Math.sin(t * 1.7 + i * 2), z = lerp(-0.42, 0.42, hash(i * 3.9));
      const p = pr([x, y, z]);
      ctx.strokeStyle = T.line(0.45 * a); ctx.lineWidth = 1.2; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.arc(p[0], p[1], 3.5, 0, TAU); ctx.stroke();
    }
    ctx.setLineDash([]); ctx.restore();
  }

  // ---- saturation chart ----
  const CH = { x: 100, y: 290, w: 780, h: 560, T0: -10, T1: 25, R1: 20 };
  const chX = Tc => CH.x + 90 + (Tc - CH.T0) / (CH.T1 - CH.T0) * (CH.w - 130);
  const chY = r => CH.y + CH.h - 70 - r / CH.R1 * (CH.h - 160);
  function chart(ctx, t, frame, a) {
    U.plate(ctx, T, CH.x - 22, CH.y - 20, CH.w + 44, CH.h + 20, a);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.font = `600 28px ${U.FONT.ui}`; ctx.letterSpacing = '3px'; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.fillStyle = T.hi(0.95 * a); ctx.fillText('СКОЛЬКО ВОДЫ ДЕРЖИТ ВОЗДУХ', CH.x, CH.y + 32); ctx.letterSpacing = '0px';
    ctx.font = `20px ${U.FONT.mono}`; ctx.fillStyle = T.dim(0.95 * a);
    ctx.fillText('Г / М³', CH.x, CH.y + 70);
    // axes + grid
    const x0 = chX(CH.T0), x1 = chX(CH.T1), y0 = chY(0), y1 = chY(CH.R1);
    ctx.strokeStyle = T.line(0.6 * a); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(x0, y1); ctx.lineTo(x0, y0); ctx.lineTo(x1, y0); ctx.stroke();
    ctx.strokeStyle = T.dim(0.25 * a); ctx.lineWidth = 1; ctx.beginPath();
    for (const r of [5, 10, 15, 20]) { ctx.moveTo(x0, chY(r)); ctx.lineTo(x1, chY(r)); }
    for (const Tc of [-10, 0, 10, 20]) { ctx.moveTo(chX(Tc), y0); ctx.lineTo(chX(Tc), y1); }
    ctx.stroke();
    ctx.fillStyle = T.dim(0.95 * a); ctx.font = `20px ${U.FONT.mono}`;
    ctx.textAlign = 'right'; for (const r of [0, 5, 10, 15, 20]) ctx.fillText(String(r), x0 - 10, chY(r) + 7);
    ctx.textAlign = 'center'; for (const Tc of [-10, 0, 10, 20]) ctx.fillText((Tc > 0 ? '+' : '') + Tc + '°', chX(Tc), y0 + 30);
    // saturation curve
    const cp = eo(seg(t, 13.4, 14.4));
    ctx.beginPath();
    for (let Tc = CH.T0; Tc <= CH.T0 + (CH.T1 - CH.T0) * cp; Tc += 0.25) { const X = chX(Tc), Y = chY(Math.min(CH.R1, rhoS(Tc))); Tc === CH.T0 ? ctx.moveTo(X, Y) : ctx.lineTo(X, Y); }
    ctx.strokeStyle = T.line(0.25 * a); ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = T.hi(0.95 * a); ctx.lineWidth = 2.5; ctx.stroke();
    if (cp > 0.95) { ctx.font = `600 22px ${U.FONT.ui}`; ctx.textAlign = 'left'; ctx.fillStyle = T.hi(0.9 * a); ctx.fillText('ПРЕДЕЛ: БОЛЬШЕ ВОДЫ', chX(1.5), chY(19.6)); ctx.fillText('ВОЗДУХ НЕ УДЕРЖИТ', chX(1.5), chY(19.6) + 26); }
    // 20 vs 0 comparison
    const cmpA = seg(t, 16.0, 16.4);
    if (cmpA > 0) {
      for (const [Tc, txt] of [[20, '17 Г'], [0, '5 Г']]) {
        const X = chX(Tc), Y = chY(rhoS(Tc));
        ctx.strokeStyle = T.line(0.8 * a * cmpA); ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(X, y0); ctx.lineTo(X, Y); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = `600 26px ${U.FONT.ui}`; ctx.textAlign = 'center'; ctx.fillStyle = T.hi(a * cmpA); ctx.fillText(txt, X + (Tc ? -44 : 40), Y - 14);
      }
    }
    // the air parcel: +20 °C, 50 % → cools at constant water content to the dew point, then follows the curve down to the glass
    const w0 = rhoS(20) * 0.5, Td = dewPoint(w0);
    const pA = seg(t, 14.0, 14.3);
    if (pA > 0) {
      const u1 = eio(seg(t, K.plus20 - 0.3, K.plus9)), u2 = eio(seg(t, K.steklo + 0.1, K.steklo + 1.7));
      let Tc = lerp(20, Td, u1), r = w0;
      if (u2 > 0) { Tc = lerp(Td, 0, u2); r = rhoS(Tc); }
      if (t < K.plus20 - 0.3) Tc = 20 - 1.2 * seg(t, K.ostyv, K.plus20 - 0.3);
      const X = chX(Tc), Y = chY(r);
      ctx.strokeStyle = T.hi(0.9 * a); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(chX(20), chY(w0)); ctx.lineTo(Math.max(X, chX(Td)), chY(w0)); ctx.stroke(); ctx.setLineDash([]);
      if (u2 > 0) {   // excess water
        ctx.strokeStyle = T.hi(0.95 * a); ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(X, chY(w0)); ctx.lineTo(X, Y); ctx.stroke();
        const ea = seg(t, K.osedaet - 0.3, K.osedaet + 0.2);
        if (ea > 0) { ctx.restore(); labelPlate(ctx, X - 16, (chY(w0) + Y) / 2 - 4, 'ЛИШНЯЯ ВОДА → КАПЛИ', a * ea, 'midR'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; }
      }
      ctx.fillStyle = T.hi(a * pA); ctx.beginPath(); ctx.arc(X, Y, 10, 0, TAU); ctx.fill();
      ctx.strokeStyle = T.line(a * pA); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, 18 + 4 * Math.sin(t * 6), 0, TAU); ctx.stroke();
      if (t < K.plus20) { ctx.font = `600 22px ${U.FONT.ui}`; ctx.textAlign = 'left'; ctx.fillStyle = T.hi(a * pA); ctx.fillText('ВОЗДУХ САЛОНА', X - 60, Y + 48); }
      // dew point lock
      const dk = seg(t, K.plus9 - 0.4, K.plus9);
      if (dk > 0) {
        const locked = t >= K.plus9, Xd = chX(Td), Yd = chY(w0);
        ctx.strokeStyle = locked ? T.acc(a) : T.line(0.8 * a); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(Xd, Yd); ctx.lineTo(Xd, y0); ctx.stroke();
        ctx.font = `600 40px ${U.FONT.ui}`; ctx.textAlign = 'center';
        ctx.fillStyle = locked ? (flashAt(t, K.plus9) ? T.hi(a) : T.acc(a)) : T.line(0.9 * a);
        const Xp = Xd - 120;
        ctx.strokeStyle = locked ? T.acc(0.8 * a) : T.line(0.6 * a); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(Xp + 60, Yd - 54); ctx.lineTo(Xd, Yd); ctx.stroke();
        ctx.restore();
        U.plate(ctx, T, Xp - 105, Yd - 118, 210, 64, a * dk);
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.font = `600 40px ${U.FONT.ui}`; ctx.textAlign = 'center';
        ctx.fillStyle = locked ? (flashAt(t, K.plus9) ? T.hi(a) : T.acc(a)) : T.line(0.9 * a);
        ctx.fillText(U.rollText('≈ +9 °C', dk, frame, 4), Xp, Yd - 72);
        const ra = seg(t, K.rosy - 0.5, K.rosy - 0.1);
        if (ra > 0) { ctx.font = `600 24px ${U.FONT.ui}`; ctx.letterSpacing = '3px'; ctx.fillStyle = T.hi(a * ra); ctx.fillText('ТОЧКА РОСЫ', Xp, Yd - 132); ctx.letterSpacing = '0px'; }
      }
    }
    ctx.restore();
  }
  function dewPoint(r) { let lo = -30, hi = 40; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; rhoS(m) > r ? hi = m : lo = m; } return (lo + hi) / 2; }

  function glassLoupe(ctx, t, frame, a, anchor) {
    const c = [500, 1080], r = 160 * eo(a);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.line(0.5 * a); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(anchor[0], anchor[1]); ctx.lineTo(c[0] - r * 0.7, c[1] - r * 0.7); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(1,8,12,${0.92 * a})`; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, TAU); ctx.fill();
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    const gx = c[0] - 40;
    ctx.fillStyle = T.dim(0.25 * a); ctx.fillRect(gx - 70, c[1] - r, 70, 2 * r);
    ctx.strokeStyle = T.line(0.8 * a); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(gx, c[1] - r); ctx.lineTo(gx, c[1] + r); ctx.stroke();
    ctx.strokeStyle = T.dim(0.5 * a); ctx.lineWidth = 1; ctx.beginPath();
    for (let y = c[1] - r; y < c[1] + r; y += 14) { ctx.moveTo(gx - 70, y + 14); ctx.lineTo(gx - 56, y); }
    ctx.stroke();
    // vapour molecules: fast and spread far from the glass, slowing near it
    const dk = seg(t, K.steklo, K.osedaet + 1.2);
    for (let i = 0; i < 46; i++) {
      const bx = gx + 20 + hash(i * 3.3) * 210, by = c[1] - r + hash(i * 5.7) * 2 * r;
      const near = 1 - clamp((bx - gx) / 210), sp = 1 - 0.7 * near;
      const x = bx + Math.sin(t * 6 * sp + i) * 10 * sp, y = by + Math.cos(t * 5 * sp + i * 2) * 10 * sp;
      if (near > 0.75 && hash(i * 9.1) < dk) continue;
      ctx.fillStyle = T.line(0.85 * a); ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
    }
    // droplets on the inner surface
    for (let i = 0; i < 9; i++) {
      const y = c[1] - r + 25 + i * (2 * r - 50) / 8, g = clamp(dk * 1.5 - hash(i * 2.1) * 0.5);
      if (g <= 0) continue;
      const rr = 4 + 12 * g;
      ctx.fillStyle = T.hi(0.25 * a); ctx.strokeStyle = T.hi(0.95 * a); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gx + 2, y, rr, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.line(0.95 * a); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, TAU); ctx.stroke();
    ctx.restore();
    labelPlate(ctx, c[0] - r - 14, c[1] - 40, 'СТЕКЛО', a * seg(a, 0.6, 1), 'midR');
    labelPlate(ctx, c[0] - r - 14, c[1] + 14, '≈ 0 °C', a * seg(a, 0.6, 1), 'midR');
    labelPlate(ctx, c[0] + 40, c[1] + r + 56, 'ВОЗДУХ +20 °C', a * seg(a, 0.6, 1), 'up');
  }

  // ================= HVAC =================
  const flapAng = t => -Math.PI / 2 * eio(seg(t, K.vkl + 0.05, K.vkl + 0.75));
  const fanAng = t => 5 * Math.max(0, t - K.inC) + 9 * Math.max(0, t - K.maks);
  const LBL = { flap: [-70, 0, 'midR'], evap: [-30, 60, 'downR'], heat: [30, -80, 'up'] };
  function sceneHV(ctx, t, frame) {
    const cam = camHV(t);
    const scan = t < K.inC + 1.2 ? { y: lerp(-0.05, 1.85, sine(seg(t, K.inC, K.inC + 1.1))), band: 0.08 } : null;
    const scanDown = t >= K.outC ? { y: lerp(1.85, -0.05, eio(seg(t, K.outC, K.outC + 0.6))) } : null;
    const heatK = seg(t, K.pechka, K.pechka + 0.6) * (1 - seg(t, K.outC, K.outC + 0.3));
    const flash = {};
    if (flashAt(t, 35.75)) flash.flap = 1;
    if (flashAt(t, K.isparitel)) flash.evap = 1;
    if (flashAt(t, K.pechka)) flash.heater = 1;
    const keep = heatK > 0.02 ? { heaterS: heatK > 0.5 ? '#ffffff' : '#bdf3ff' } : {};
    const info = holo.draw(ctx, mhv, cam, { hue: HUE, scan, scanDown, flash, keep, angle: { flp: flapAng(t), blades: fanAng(t) }, solid: 0.15, scanOffset: t * 24, lineWidth: 1.5 });
    if (scan) drawScanPlane(ctx, cam, W, H, scan.y, { hue: HUE, r: 1.8, c: [-0.35, 0, 0], rot: t * 0.3, alpha: 1 - seg(t, K.inC + 0.8, K.inC + 1.2) });
    if (scanDown && t < K.outC + 0.6) drawScanPlane(ctx, cam, W, H, scanDown.y, { hue: HUE, r: 1.8, c: [-0.35, 0, 0], rot: -t * 0.3, alpha: 1 - seg(t, K.outC + 0.4, K.outC + 0.6) });
    const P = info.project, pr = p => { P(p[0], p[1], p[2] || 0, P3); return [P3[0], P3[1]]; };
    const vis = seg(t, K.inC + 0.6, K.inC + 1.1) * (1 - seg(t, K.outC - 0.1, K.outC + 0.2));
    if (vis <= 0) return;
    flow(ctx, pr, t, vis);
    // part labels
    const lab = (p, txt, a, dx = 0, dy = -60, dir = 'up') => {
      if (a <= 0) return; const q = pr(p), x = q[0] + dx, y = q[1] + dy;
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.line(0.55 * a); ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = T.hi(a); ctx.beginPath(); ctx.arc(q[0], q[1], 4, 0, TAU); ctx.fill(); ctx.restore();
      labelPlate(ctx, x, y, txt, a, dir);
    };
    const fresh = t >= K.vkl + 0.4;
    lab([-1.0, 1.62, 0.22], fresh ? 'УЛИЦА · ОТКРЫТО' : 'УЛИЦА · ЗАКРЫТО', vis * seg(t, 30.0, 30.4) * (1 - seg(t, 43.6, 44.0)), -30, -90, 'upR');
    lab([-1.25, 1.2, 0.22], fresh ? 'САЛОН · ЗАКРЫТО' : 'ИЗ САЛОНА', vis * seg(t, 30.0, 30.4) * (1 - seg(t, 43.6, 44.0)), -30, 90, 'downR');
    U.targetBox(ctx, T, info.bbox.flap, seg(t, K.recirc - 0.22, K.recirc) * (1 - seg(t, 36.8, 37.2)) * vis, { flash: flashAt(t, K.recirc) || flashAt(t, 35.75), pad: 18 });
    lab(HV.pivot, 'ЗАСЛОНКА', seg(t, K.recirc, K.recirc + 0.2) * (1 - seg(t, 36.8, 37.2)) * vis, LBL.flap[0], LBL.flap[1], LBL.flap[2]);
    card(ctx, t, frame, 100, 290, { label: 'РЕЦИРКУЛЯЦИЯ', value: 'ВЫКЛ', detail: 'ВОЗДУХ — С УЛИЦЫ' }, { r0: 30.4, l0: 30.6, l1: 31.9, d0: K.ulicy - 0.3 }, 1 - seg(t, 36.9, 37.2), { w: 520, big: 110, index: '02' });
    if (t > 32.5 && t < 35.4) labelPlate(ctx, 470, pr([-0.4, 2.3, 0])[1] + 14, 'ПО КРУГУ', win(t, 32.5, 35.4), 'down');
    card(ctx, t, frame, 100, 290, { label: 'ВЛАЖНОСТЬ ПОСЛЕ ПЕЧКИ', value: '≈10', unit: '%', detail: 'МОРОЗНЫЙ ВОЗДУХ −12 °C → +20 °C' }, { r0: 37.3, l0: 41.2, l1: K.desyati, d0: 39.3 }, 1 - seg(t, 43.5, 43.8), { w: 620, big: 132, index: '03' });
    card(ctx, t, frame, 100, 290, { label: 'КОНДИЦИОНЕР', value: 'ВКЛ', detail: 'ДАЖЕ ЗИМОЙ' }, { r0: 44.0, l0: 44.6, l1: K.cond, d0: 46.2 }, 1 - seg(t, 53.6, 53.95), { w: 520, big: 110, index: '04' });
    U.targetBox(ctx, T, info.bbox.evap, seg(t, K.isparitel - 0.22, K.isparitel) * vis, { flash: flashAt(t, K.isparitel), pad: 16 });
    lab([HV.evap.x0, HV.evap.y0, 0], 'ИСПАРИТЕЛЬ · ХОЛОДНЫЙ', seg(t, K.isparitel, K.isparitel + 0.2) * vis, LBL.evap[0], LBL.evap[1], LBL.evap[2]);
    if (t > K.vlaga - 0.2) evapWater(ctx, pr, t, vis);
    lab(HV.drain[1], 'ВОДА → НАРУЖУ', vis * seg(t, K.naruzhu - 0.1, K.naruzhu + 0.2), 40, -6, 'mid');
    U.targetBox(ctx, T, info.bbox.heater, seg(t, K.pechka - 0.22, K.pechka) * vis, { flash: flashAt(t, K.pechka), pad: 16 });
    lab([HV.heat.x1, HV.heat.y1, 0], 'ПЕЧКА', seg(t, K.pechka, K.pechka + 0.2) * vis, LBL.heat[0], LBL.heat[1], LBL.heat[2]);
    lab(HV.out, 'СУХОЙ ТЁПЛЫЙ → К СТЕКЛУ', vis * seg(t, K.suhoiV - 0.1, K.suhoiV + 0.2), -400, -20);
  }
  function polyLen(pts) { const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return L; }
  function along(pts, L, s) { let i = 1; while (i < L.length - 1 && L[i] < s) i++; const k = (s - L[i - 1]) / (L[i] - L[i - 1]); return [lerp(pts[i - 1][0], pts[i][0], k), lerp(pts[i - 1][1], pts[i][1], k)]; }
  const LOOP = [[0.9, 1.9], [0.9, 2.3], [-1.85, 2.3], [-1.85, 1.0], [-1.6, 1.0]];
  const LEN = { recirc: polyLen(PATH.recirc), fresh: polyLen(PATH.fresh), loop: polyLen(LOOP) };
  function flow(ctx, pr, t, a) {
    const fresh = t >= K.vkl + 0.45, mode = fresh ? 'fresh' : 'recirc', pts = PATH[mode], L = LEN[mode], tot = L[L.length - 1];
    const sw = fresh ? seg(t, K.vkl + 0.45, K.vkl + 1.1) : 1;
    const ac = t >= 47.1, heat = t >= K.pechka;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const v = t >= K.maks ? 1.6 : 0.8, n = 34;
    for (let i = 0; i < n; i++) {
      const s = ((t * v + i * tot / n) % tot);
      if (fresh && s > tot * sw) continue;
      const [x, y] = along(pts, L, s);
      const wet = fresh ? (hash(i * 3.1) < 0.2 ? 1 : 0) : 2;
      const dried = ac && x > HV.evap.x1 ? 0 : wet, warm = x > HV.heat.x1 ? (heat ? 1 : 0.4) : 0;
      dot(ctx, pr([x, y, 0]), dried, warm, a);
    }
    if (!fresh || t < K.vkl + 1.0) {   // humid cabin air going round
      const la = a * win(t, 30.2, K.vkl + 1.0, 0.4, 0.6), tl = LEN.loop[LEN.loop.length - 1];
      ctx.strokeStyle = T.line(0.4 * la); ctx.setLineDash([8, 8]); ctx.lineWidth = 2; ctx.beginPath();
      LOOP.forEach((p, i) => { const q = pr([p[0], p[1], 0]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.stroke(); ctx.setLineDash([]);
      for (let i = 0; i < 14; i++) { const s = (t * v + i * tl / 14) % tl, [x, y] = along(LOOP, LEN.loop, s); dot(ctx, pr([x, y, 0]), 2, 0.4, la); }
    }
    ctx.restore();
  }
  function dot(ctx, p, wet, warm, a) {
    ctx.fillStyle = warm > 0.5 ? T.hi(0.95 * a) : T.line(0.85 * a);
    ctx.beginPath(); ctx.arc(p[0], p[1], 5.5, 0, TAU); ctx.fill();
    for (let k = 0; k < wet; k++) {
      const dx = k ? -9 : 9;
      ctx.strokeStyle = T.hi(0.9 * a); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p[0] + dx, p[1] - 7); ctx.quadraticCurveTo(p[0] + dx + 4, p[1], p[0] + dx, p[1] + 3); ctx.quadraticCurveTo(p[0] + dx - 4, p[1], p[0] + dx, p[1] - 7); ctx.stroke();
    }
  }
  function evapWater(ctx, pr, t, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const B = HV.evap, g = seg(t, K.vlaga - 0.2, K.vlaga + 1.0);
    for (let i = 0; i < 16; i++) {
      const y = lerp(B.y0 + 0.06, B.y1 - 0.06, hash(i * 2.7)), z = lerp(-0.15, 0.15, hash(i * 5.3));
      const q = pr([B.x1 + 0.01, y, z]);
      ctx.fillStyle = T.hi(0.85 * a * g); ctx.beginPath(); ctx.arc(q[0], q[1], 2 + 4 * g * hash(i * 9.9), 0, TAU); ctx.fill();
    }
    if (t > K.vlaga + 0.6) for (let i = 0; i < 6; i++) {
      const u = ((t - K.vlaga - 0.6) * 0.9 + i / 6) % 1;
      const q = pr([HV.drain[0][0], lerp(B.y0, HV.drain[1][1] - 0.15, u), 0]);
      ctx.fillStyle = T.hi(0.95 * a); ctx.beginPath(); ctx.ellipse(q[0], q[1], 4.5, 7, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  // ================= Car: defrost, caveats, summary =================
  function sceneD(ctx, t, frame) {
    const cam = camD(t);
    drawPad(ctx, cam, W, H, { hue: HUE, rot: t * 0.1, alpha: seg(t, K.inD, K.inD + 0.4) * (1 - seg(t, K.outD + 0.6, K.outD + 1.2) * 0.7) });
    const scan = t < K.inD + 1.2 ? { y: lerp(-0.02, 0.85, sine(seg(t, K.inD, K.inD + 1.1))), band: 0.05 } : null;
    const scanDown = t >= K.outD ? { y: lerp(0.85, -0.05, eio(seg(t, K.outD, K.outD + 1.2))) } : null;
    const flash = {};
    if (flashAt(t, K.svezh)) flash.dash = 1;
    const road = seg(t, K.suhoiEnd, K.suhoiEnd + 1.5) * (1 - seg(t, K.outD, K.outD + 0.8));
    if (road > 0) roadLines(ctx, cam, t, road);
    const info = holo.draw(ctx, mcar, cam, { hue: HUE, scan, scanDown, flash, solid: 0.12, scanOffset: t * 24, focus: t > 67.6 && t < 72.2 ? 'windshield' : null, dim: 0.4 });
    if (scan) drawScanPlane(ctx, cam, W, H, scan.y, { hue: HUE, r: 1.5, rot: t * 0.3, alpha: 1 - seg(t, K.inD + 0.8, K.inD + 1.2) });
    if (scanDown && t < K.outD + 1.2) drawScanPlane(ctx, cam, W, H, scanDown.y, { hue: HUE, r: 1.5, rot: -t * 0.3, alpha: 1 - seg(t, K.outD + 0.9, K.outD + 1.2) });
    const P = info.project, pr = p => { P(p[0], p[1], p[2], P3); return [P3[0], P3[1]]; };
    const vis = seg(t, K.inD + 0.3, K.inD + 1.1) * (1 - seg(t, K.outD, K.outD + 0.5));
    const smearRe = t > 67.6 && t < 72.2 ? win(t, 67.7, 72.2, 0.4, 0.4) : 0;
    fog(ctx, pr, t, vis * (1 - 0.0) * (1 - 0.0 * smearRe), clearFront(t));
    const hudA = 1 - seg(t, K.outD, K.outD + 0.4);
    // defrost airflow from the dash vents up the glass
    const fA = seg(t, K.obduv, K.obduv + 0.4) * (1 - seg(t, 62.2, 62.7));
    if (fA > 0) defrostFlow(ctx, pr, t, fA * vis);
    card(ctx, t, frame, 100, 290, { label: 'ОБДУВ ЛОБОВОГО', value: 'MAX', detail: 'ВЕНТИЛЯТОР НА МАКСИМУМ' }, { r0: 54.9, l0: 55.4, l1: K.maks, d0: 57.3 }, 1 - seg(t, 58.5, 58.8), { w: 520, big: 110, index: '05' });
    if (t > 58.7) {
      const tc = seg(t, 59.1, K.rosy2), locked = t >= K.rosy2, val = '+' + Math.round(lerp(0, 12, eio(tc)));
      const o = 1 - seg(t, 62.3, 62.6);
      if (o > 0) U.specCard(ctx, T, 100, 290, { label: 'ТЕМПЕРАТУРА СТЕКЛА', value: val, unit: '°C', detail: 'ВЫШЕ ТОЧКИ РОСЫ (+9 °C) — КАПЛИ ИСПАРЯЮТСЯ' },
        { reveal: seg(t, 58.75, 59.05), roll: locked ? 1 : 0.999 * seg(t, 58.9, 59.05), detail: seg(t, 60.0, 60.6), frame, flash: flashAt(t, K.rosy2) }, { w: 640, big: 132, index: '06', alpha: o });
    }
    // frost caveat + fresh air through the cowl
    const wA = win(t, 63.0, 67.4, 0.3, 0.3);
    if (wA > 0) { warnPlate(ctx, 100, 300, ['В МОРОЗ КОМПРЕССОР', 'МОЖЕТ НЕ ВКЛЮЧИТЬСЯ'], wA, frame); }
    U.targetBox(ctx, T, info.bbox.dash, seg(t, K.svezh - 0.22, K.svezh) * (1 - seg(t, 67.2, 67.5)), { flash: flashAt(t, K.svezh), tag: 'ЗАБОР С УЛИЦЫ', pad: 12 });
    const cA = win(t, 65.0, 67.5, 0.3, 0.3);
    if (cA > 0) cowlFlow(ctx, pr, t, cA);
    // smears loupe
    if (smearRe > 0) smearLoupe(ctx, t, frame, smearRe, pr(wsPoint(0.35, 0.5)));
    // summary
    const chips = [[72.3, { label: 'РЕЦИРКУЛЯЦИЯ', value: 'ВЫКЛ' }], [72.8, { label: 'ВОЗДУХ', value: 'УЛИЦА' }], [73.3, { label: 'КОНДИЦИОНЕР', value: 'ВКЛ' }], [73.8, { label: 'ОБДУВ', value: 'MAX' }]];
    chips.forEach(([t0, c], i) => { const a = seg(t, t0, t0 + 0.25) * hudA; if (a > 0) U.chip(ctx, T, i % 2 ? 520 : 100, 290 + Math.floor(i / 2) * 120, c, a, { w: 340, index: '0' + (i + 1) }); });
    if (road > 0) labelPlate(ctx, 100, 1200, 'СТЕКЛО ЧИСТОЕ · ДОРОГУ ВИДНО', road * seg(t, K.dorogu - 0.2, K.dorogu + 0.2) * hudA, 'up', false, t >= K.dorogu && t < K.dorogu + FL ? 'hi' : null);
    const tl = seg(t, K.title, K.title + 0.5);
    if (tl > 0) {
      ctx.save();
      U.plate(ctx, T, 100, 760, 800, 230, tl);
      ctx.globalCompositeOperation = 'lighter'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 54px ${U.FONT.ui}`; ctx.letterSpacing = '4px'; ctx.fillStyle = T.hi(0.96 * tl);
      ctx.fillText(U.rollText('СТЁКЛА ЗАПОТЕЛИ?', tl, frame, 2), 500, 840);
      ctx.font = `500 32px ${U.FONT.ui}`; ctx.letterSpacing = '3px'; ctx.fillStyle = T.acc(0.95 * seg(t, K.title + 0.4, K.title + 0.8));
      ctx.fillText('СУХОЙ ВОЗДУХ + ТЁПЛОЕ СТЕКЛО', 500, 915);
      ctx.restore();
    }
  }
  function defrostFlow(ctx, pr, t, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const sp = t >= K.maks ? 1.4 : 0.7;
    for (let i = 0; i < 9; i++) {
      const u = 0.08 + i * 0.105;
      for (const pass of [0, 1]) {
        ctx.beginPath();
        const ph = ((t * sp + i * 0.37) % 1);
        for (let j = 0; j <= 20; j++) {
          const v = clamp(ph - 0.35 + j / 20 * 0.35);
          const p = pr(wsPoint(u + 0.015 * Math.sin(v * 9 + i), v, 0.03));
          j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
        }
        ctx.strokeStyle = pass ? T.hi(0.85 * a) : T.line(0.2 * a); ctx.lineWidth = pass ? 2.2 : 9; ctx.stroke();
      }
    }
    ctx.restore();
  }
  function cowlFlow(ctx, pr, t, a) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const z = -0.32 + i * 0.16, u = (t * 0.9 + i * 0.21) % 1;
      const p0 = pr([CAR.cowl[0] + 0.7, CAR.cowl[1] + 0.3, z]), p1 = pr([CAR.cowl[0], CAR.cowl[1], z]);
      const k = eo(u), q = [lerp(p0[0], p1[0], k), lerp(p0[1], p1[1], k)];
      ctx.fillStyle = T.line(0.9 * a * Math.sin(Math.PI * u)); ctx.beginPath(); ctx.arc(q[0], q[1], 5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }
  function roadLines(ctx, cam, t, a) {
    const Pc = makeCamera(cam, W, H).project, p = new Float32Array(3);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = T.dim(0.45 * a); ctx.lineWidth = 2;
    for (const z of [-0.95, 0.95]) { ctx.beginPath(); for (let x = -3; x <= 3.6; x += 0.1) { Pc(x, 0, z, p); x > -3 ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
    ctx.strokeStyle = T.line(0.7 * a); ctx.lineWidth = 3;
    const off = (t * 1.6) % 0.8;
    for (let x = -3 + off; x < 3.6; x += 0.8) {
      ctx.beginPath(); Pc(x, 0, -1.6, p); ctx.moveTo(p[0], p[1]); Pc(Math.min(3.6, x + 0.4), 0, -1.6, p); ctx.lineTo(p[0], p[1]); ctx.stroke();
    }
    ctx.restore();
  }
  function smearLoupe(ctx, t, frame, a, anchor) {
    const c = [500, 1040], r = 170 * eo(a);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.line(0.5 * a); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(anchor[0], anchor[1]); ctx.lineTo(c[0], c[1] - r); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(1,8,12,${0.92 * a})`; ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, TAU); ctx.fill();
    ctx.save(); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
    const sm = seg(t, 67.9, 68.9), fg = seg(t, K.razvody, K.razvody + 1.4);
    const streak = (k, y) => [c[0] - r + 2 * r * k, y + 26 * Math.sin(k * 7 + y * 0.03)];
    for (let s = 0; s < 4; s++) {
      const y0 = c[1] - 90 + s * 55;
      ctx.strokeStyle = T.line(0.55 * a); ctx.lineWidth = 14; ctx.beginPath();
      for (let k = 0; k <= sm; k += 0.02) { const q = streak(k, y0); k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
      ctx.stroke();
      for (let i = 0; i < 40; i++) {
        const k = hash(i * 3.1 + s), q = streak(k, y0); if (k > sm) continue;
        const g = clamp(fg * 1.6 - hash(i * 7.7 + s) * 0.6);
        if (g <= 0) continue;
        ctx.fillStyle = T.hi(0.85 * a * g); ctx.beginPath(); ctx.arc(q[0] + (hash(i) - 0.5) * 14, q[1] + (hash(i * 2) - 0.5) * 12, 2 + 3 * g, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.line(0.95 * a); ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(c[0], c[1], r, 0, TAU); ctx.stroke();
    ctx.restore();
    warnPlate(ctx, 100, 300, ['НЕ ПРОТИРАЙТЕ', 'СТЕКЛО РУКОЙ'], a * seg(t, 68.3, 68.7), frame);
    labelPlate(ctx, c[0] - 150, c[1] + r + 56, 'РАЗВОДЫ ЗАПОТЕВАЮТ БЫСТРЕЕ', a * seg(t, K.razvody, K.razvody + 0.3), 'up');
  }
  function warnPlate(ctx, x, y, lines, a, frame) {
    if (a <= 0) return;
    const w = 640, h = 50 + lines.length * 52;
    U.plate(ctx, T, x - 22, y - 20, w + 44, h + 20, a);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = T.hi(0.95 * a); ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 26, y + 8); ctx.lineTo(x + 52, y + 54); ctx.lineTo(x, y + 54); ctx.closePath(); ctx.stroke();
    ctx.font = `700 30px ${U.FONT.ui}`; ctx.textAlign = 'center'; ctx.fillStyle = T.hi(a); ctx.fillText('!', x + 26, y + 49);
    ctx.textAlign = 'left'; ctx.font = `600 40px ${U.FONT.ui}`; ctx.letterSpacing = '2px'; ctx.fillStyle = T.hi(0.96 * a);
    lines.forEach((l, i) => ctx.fillText(U.rollText(l, clamp(a * 1.3), frame, 7 + i), x + 76, y + 46 + i * 52));
    ctx.restore();
  }

  // ---------- Shared UI ----------
  function card(ctx, t, frame, x, y, c, s, out, o) {
    if (t < s.r0 || out <= 0) return;
    U.specCard(ctx, T, x, y, c, { reveal: seg(t, s.r0, s.r0 + 0.45), roll: seg(t, s.l0, s.l1), detail: s.d0 ? seg(t, s.d0, s.d0 + 0.6) : 0, frame, flash: flashAt(t, s.l1) }, { ...o, alpha: out });
  }
  function labelPlate(ctx, x, y, text, a, anchor = 'up', big = false, col = null) {
    if (a <= 0) return;
    ctx.save();
    ctx.font = `600 28px ${U.FONT.ui}`; ctx.letterSpacing = '2px';
    const w = ctx.measureText(text).width + 28, h = 44;
    if (anchor.endsWith('R')) { x -= w; anchor = anchor.slice(0, -1); }
    x = Math.max(SAFE.x0 + 10, Math.min(SAFE.x1 - 10 - w, x));
    const yy = anchor === 'up' ? y - h : anchor === 'mid' ? y - h / 2 : y;
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = `rgba(1,8,12,${0.86 * a})`; ctx.fillRect(x, yy, w, h);
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = T.line(0.6 * a); ctx.lineWidth = 1.2; ctx.strokeRect(x + .5, yy + .5, w - 1, h - 1);
    ctx.fillStyle = col === 'acc' ? T.acc(a) : T.hi(0.95 * a);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 14, yy + h / 2 + 1);
    ctx.restore();
  }
  function chrome(ctx, t, frame) {
    const a = clamp(t * 3) * (1 - seg(t, DUR - 0.6, DUR - 0.1));
    const sc = t < 13.2 ? 1 : t < K.inC + 0.3 ? 2 : t < K.inD + 0.2 ? 3 : 4;
    const name = ['', 'САЛОН ЗИМОЙ', 'КОНДЕНСАТ', 'КЛИМАТ-БЛОК', 'ОБДУВ СТЕКЛА'][sc];
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = T.line(0.5 * a); ctx.lineWidth = 1.5;
    U.corners(ctx, SAFE.x0, SAFE.y0 - 10, SAFE.x1, SAFE.y1, 40);
    ctx.font = `22px ${U.FONT.mono}`; ctx.textBaseline = 'middle'; ctx.fillStyle = T.line(0.75 * a);
    ctx.textAlign = 'left'; ctx.fillText(`0${sc} · ${name}`, SAFE.x0 + 24, SAFE.y0 + 18);
    ctx.textAlign = 'right'; ctx.fillText(`T+${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`, SAFE.x1 - 24, SAFE.y0 + 18);
    ctx.restore();
  }
  function subs(ctx, t) {
    for (const [a, b, s] of CUES) if (t >= a - 0.05 && t < b) {
      const al = seg(t, a - 0.05, a + 0.1) * (1 - seg(t, b - 0.1, b));
      U.subtitle(ctx, W, H, T, s, al, { y: 1428, maxW: 740, x: 488, t });
    }
  }
  return { render, DUR, EV, CUES };
}
