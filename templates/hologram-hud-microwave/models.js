import { Model } from './models/mkmodel.mjs';
import { prepModel } from './engine/holo.js';

const TAU = Math.PI * 2;
export const S = 3.3;
const s3 = p => p.map(x => x * S);

// ---------- Microwave (metres × S, front = +z) ----------
export const MW = {
  cav: { x0: -0.23 * S, x1: 0.09 * S, y0: 0.03 * S, y1: 0.27 * S, z0: -0.17 * S, z1: 0.17 * S },
  port: [0.09 * S, 0.22 * S, -0.05 * S],
  plateC: [-0.07 * S, 0.04 * S, 0],
  mag: [0.175 * S, 0.195 * S, -0.06 * S],
  door: [-0.075 * S, 0.15 * S, 0.2 * S],
  bowl: [-0.07 * S, 0.08 * S, 0],
};

export function microwave() {
  const m = new Model('microwave');
  const box = (c, sz) => m.box(s3(c), s3(sz));
  const ln = (a, b) => m.edge(m.vtx(s3(a)), m.vtx(s3(b)));

  m.part('body', { anchor: s3([0, 0.3, 0]) });
  m.piece('shell');
  box([0, 0.15, 0], [0.5, 0.3, 0.38]);
  for (const x of [-0.21, 0.21]) for (const z of [-0.15, 0.15]) box([x, -0.004, z], [0.04, 0.008, 0.04]);
  for (let i = 1; i < 6; i++) { const z = -0.19 + 0.38 * i / 6; ln([-0.25, 0.3, z], [0.25, 0.3, z]); }
  ln([0.1, 0, 0.19], [0.1, 0.3, 0.19]);
  m.piece('side', { explode: s3([0.16, 0, 0]) });
  const sx = 0.253;
  for (const [a, b] of [[[sx, 0.01, -0.18], [sx, 0.29, -0.18]], [[sx, 0.29, -0.18], [sx, 0.29, 0.18]], [[sx, 0.29, 0.18], [sx, 0.01, 0.18]], [[sx, 0.01, 0.18], [sx, 0.01, -0.18]]]) ln(a, b);
  for (let i = 0; i < 9; i++) { const y = 0.17 + i * 0.012; ln([sx, y, -0.14], [sx, y, -0.02]); }
  {
    const P = [[sx, 0.01, -0.18], [sx, 0.29, -0.18], [sx, 0.29, 0.18], [sx, 0.01, 0.18]].map(p => m.vtx(s3(p)));
    m.quad(...P);
  }

  m.part('cavity', { anchor: s3([-0.07, 0.27, -0.17]) });
  m.piece('cav');
  box([-0.07, 0.15, 0], [0.32, 0.24, 0.34]);
  for (let i = 1; i < 4; i++) { const y = 0.03 + 0.24 * i / 4; ln([-0.23, y, -0.17], [0.09, y, -0.17]); ln([-0.23, y, -0.17], [-0.23, y, 0.17]); }
  for (let i = 1; i < 4; i++) { const x = -0.23 + 0.32 * i / 4; ln([x, 0.03, -0.17], [x, 0.27, -0.17]); ln([x, 0.27, -0.17], [x, 0.27, 0.17]); }
  {
    const c = MW.port.map(v => v / S);
    const P = [[0.09, c[1] - 0.025, c[2] - 0.03], [0.09, c[1] + 0.025, c[2] - 0.03], [0.09, c[1] + 0.025, c[2] + 0.03], [0.09, c[1] - 0.025, c[2] + 0.03]];
    for (let i = 0; i < 4; i++) ln(P[i], P[(i + 1) % 4]);
  }

  m.part('panel', { anchor: s3([0.17, 0.25, 0.19]) });
  m.piece('pnl');
  box([0.17, 0.255, 0.192], [0.1, 0.035, 0.006]);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) box([0.14 + c * 0.03, 0.2 - r * 0.028, 0.192], [0.022, 0.018, 0.004]);
  m.circle(s3([0.17, 0.08, 0.193]), [0, 0, 1], 0.028 * S, 24);
  m.circle(s3([0.17, 0.08, 0.196]), [0, 0, 1], 0.018 * S, 16);
  ln([0.17, 0.08, 0.196], [0.17, 0.1, 0.196]);

  m.part('magnetron', { anchor: s3([0.175, 0.25, -0.06]), center: MW.mag });
  m.piece('mag-housing', { explode: s3([0.05, 0, 0]) });
  box([0.175, 0.195, -0.06], [0.09, 0.09, 0.1]);
  m.piece('mag-core', { internal: true, hot: true, explode: s3([0.05, 0, 0]) });
  m.tube(s3([0.175, 0.15, -0.06]), s3([0.175, 0.24, -0.06]), 0.026 * S, { rings: 4, seg: 16, longs: 8 });
  for (let i = 0; i < 6; i++) { const y = 0.16 + i * 0.014; box([0.175, y, -0.06], [0.08, 0.003, 0.08]); }
  m.tube(s3([0.175, 0.24, -0.06]), s3([0.175, 0.262, -0.06]), 0.008 * S, { rings: 2, seg: 10, longs: 4 });
  m.piece('waveguide', { internal: true, explode: s3([0.025, 0, 0]) });
  box([0.11, 0.22, -0.05], [0.04, 0.05, 0.06]);

  m.part('door', { anchor: s3([0.085, 0.27, 0.2]), center: MW.door });
  m.piece('frame');
  box([-0.075, 0.15, 0.2], [0.34, 0.28, 0.012]);
  {
    const x0 = -0.215, x1 = 0.045, y0 = 0.045, y1 = 0.255, z = 0.207;
    for (const [a, b] of [[[x0, y0, z], [x1, y0, z]], [[x1, y0, z], [x1, y1, z]], [[x1, y1, z], [x0, y1, z]], [[x0, y1, z], [x0, y0, z]]]) ln(a, b);
  }
  box([0.07, 0.15, 0.215], [0.012, 0.18, 0.018]);
  m.piece('mesh');
  {
    const x0 = -0.215, x1 = 0.045, y0 = 0.045, y1 = 0.255, z = 0.205;
    for (let i = 1; i < 22; i++) { const x = x0 + (x1 - x0) * i / 22; ln([x, y0, z], [x, y1, z]); }
    for (let i = 1; i < 18; i++) { const y = y0 + (y1 - y0) * i / 18; ln([x0, y, z], [x1, y, z]); }
  }

  m.part('plate', { anchor: s3([-0.07, 0.045, 0.13]) });
  m.piece('plt');
  m.disc(s3([-0.07, 0.04, 0]), [0, 1, 0], 0.13 * S, { rings: [0.13 * S, 0.122 * S, 0.06 * S], seg: 48 });
  m.ring(s3([-0.07, 0.034, 0]), [0, 1, 0], 0.07 * S, 32, 0.008 * S);
  for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; ln([-0.07 + Math.cos(a) * 0.06, 0.041, Math.sin(a) * 0.06], [-0.07 + Math.cos(a) * 0.12, 0.041, Math.sin(a) * 0.12]); }

  m.part('bowl', { anchor: s3([-0.07, 0.1, 0]), center: MW.bowl });
  m.piece('bwl');
  bowlShape(m, s3([-0.07, 0.042, 0]), 0.05 * S, 0.085 * S, 0.06 * S, 20);
  m.piece('food');
  m.disc(s3([-0.07, 0.088, 0]), [0, 1, 0], 0.076 * S, { rings: [0.076 * S, 0.05 * S, 0.025 * S], seg: 32 });

  return prepModel(m.toJSON());
}

function bowlShape(m, c, rb, rt, h, seg) {
  const N = 5, R = [];
  for (let k = 0; k < N; k++) {
    const u = k / (N - 1), r = rb + (rt - rb) * Math.sin(u * Math.PI / 2);
    R.push(m.circle([c[0], c[1] + h * u, c[2]], [0, 1, 0], r, seg));
  }
  for (let k = 0; k < N - 1; k++) for (let i = 0; i < seg; i++) { m.quad(R[k][i], R[k][(i + 1) % seg], R[k + 1][(i + 1) % seg], R[k + 1][i]); if (i % 2 === 0) m.edge(R[k][i], R[k + 1][i]); }
}

// ---------- Water molecule (stage units, centre c, dipole pointing −y at angle 0) ----------
export const HB = 104.5 * Math.PI / 180;
export function molParts(m, id, c, sc = 1, ex = [0, 0, 0]) {
  const ax = { c, d: [0, 0, 1] };
  const sph = (p, r, n) => {
    for (let k = 1; k < n; k++) { const a = -Math.PI / 2 + Math.PI * k / n; m.circle([p[0], p[1] + Math.sin(a) * r, p[2]], [0, 1, 0], Math.cos(a) * r, 28); }
    for (let k = 0; k < n; k++) { const a = k / n * Math.PI; m.circle(p, [Math.cos(a), 0, Math.sin(a)], r, 28); }
  };
  const L = 0.95 * sc, ro = 0.42 * sc, rh = 0.25 * sc;
  const hs = [-1, 1].map(s => [c[0] + s * Math.sin(HB / 2) * L, c[1] - Math.cos(HB / 2) * L, c[2]]);
  m.part(id, { anchor: [c[0], c[1] + ro, c[2]], center: c });
  m.piece(id + '-o', { axis: ax, explode: ex }); sph(c, ro, 4);
  m.piece(id + '-h', { axis: ax, explode: ex }); for (const h of hs) sph(h, rh, 3);
  m.piece(id + '-b', { axis: ax, explode: ex });
  for (const h of hs) {
    const d = [h[0] - c[0], h[1] - c[1], h[2] - c[2]], l = Math.hypot(...d), u = d.map(x => x / l);
    m.tube(c.map((x, i) => x + u[i] * ro * 0.9), h.map((x, i) => x - u[i] * rh * 0.9), 0.07 * sc, { rings: 4, seg: 10, longs: 4 });
  }
  return { o: c, h: hs, L, ro, rh };
}
export const MOL_C = [0, 1.05, 0];
export function molecule() {
  const m = new Model('h2o');
  molParts(m, 'w0', MOL_C, 1);
  return prepModel(m.toJSON());
}
export const FIELD = [];
export function moleculeField() {
  const m = new Model('field');
  let n = 0;
  for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) {
    const j = (k) => { const s = Math.sin((r * 7 + c * 13 + k) * 91.7) * 43758.5; return s - Math.floor(s); };
    const p = r === 0 && c === 0 ? MOL_C : [c * 2.35 + (j(1) - 0.5) * 0.4, MOL_C[1] + r * 2.25 + (j(2) - 0.5) * 0.35, (j(3) - 0.5) * 0.8];
    const id = 'w' + n++;
    const a = j(6) * TAU;
    molParts(m, id, p, 1, [Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0]);
    FIELD.push({ id, c: p, ph: j(4) * TAU, sp: 0.7 + j(5) * 0.6 });
  }
  return prepModel(m.toJSON());
}

// ---------- Food in a bowl on the turntable: concentric shells f0 (outer) … f5 (centre) ----------
export const FOOD = { n: 6, R: 1.0, top: 0.62, bot: 0.14 };
export function foodBowl() {
  const m = new Model('food');
  m.part('plate', { anchor: [0, 0.02, 1.4] });
  m.piece('fplate');
  m.disc([0, 0.02, 0], [0, 1, 0], 1.45, { rings: [1.45, 1.38, 0.7], seg: 72 });
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; m.edge(m.vtx([Math.cos(a) * 0.72, 0.02, Math.sin(a) * 0.72]), m.vtx([Math.cos(a) * 1.36, 0.02, Math.sin(a) * 1.36])); }
  m.part('bowl', { anchor: [1.12, 0.7, 0] });
  m.piece('fbowl');
  bowlShape(m, [0, 0.03, 0], 0.68, 1.12, 0.72, 36);
  const { n, R, top, bot } = FOOD;
  for (let k = 0; k < n; k++) {
    const r0 = R * (1 - k / n), id = 'f' + k;
    m.part(id, { anchor: [r0, top, 0] });
    m.piece(id + 'p');
    const r1 = R * (1 - (k + 1) / n), A = m.circle([0, top, 0], [0, 1, 0], r0, 48);
    if (r1 > 0.01) {
      const B = m.circle([0, top, 0], [0, 1, 0], r1, 48);
      for (let i = 0; i < 48; i++) m.quad(A[i], A[(i + 1) % 48], B[(i + 1) % 48], B[i]);
    } else {
      const c0 = m.vtx([0, top, 0]);
      for (let i = 0; i < 48; i++) m.quad(A[i], A[(i + 1) % 48], c0, c0);
    }
    if (k === 0) {
      const B = m.circle([0, bot, 0], [0, 1, 0], r0 * 0.72, 48);
      for (let i = 0; i < 48; i += 4) m.edge(A[i], B[i]);
    }
  }
  return prepModel(m.toJSON());
}
