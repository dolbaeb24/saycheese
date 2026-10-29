import { Model } from './models/mkmodel.mjs';
import { prepModel } from './engine/holo.js';

const TAU = Math.PI * 2;
export const S = 0.55;
const s3 = p => p.map(x => x * S);

// ---------- Sedan (metres × S): length along x, front = +x, up = y, right side = +z (driver on the left, z < 0) ----------
const WSm = { bl: [0.95, 0.98, -0.78], br: [0.95, 0.98, 0.78], tl: [-0.08, 1.43, -0.64], tr: [-0.08, 1.43, 0.64] };
export const WS = Object.fromEntries(Object.entries(WSm).map(([k, v]) => [k, s3(v)]));
export const wsPoint = (u, v, inset = 0.012) => {
  const L = (a, b, k) => a.map((x, i) => x + (b[i] - x) * k);
  const p = L(L(WS.bl, WS.br, u), L(WS.tl, WS.tr, u), v);
  return [p[0] - inset, p[1] - inset * 0.3, p[2]];
};
export const CAR = {
  head: s3([-0.42, 1.18, -0.38]), mouth: s3([-0.31, 1.13, -0.38]), boot: s3([0.55, 0.36, -0.38]),
  vent: s3([0.88, 0.97, 0]), cowl: s3([1.05, 0.97, 0]), dash: s3([0.7, 0.86, 0]),
};

export function car() {
  const m = new Model('sedan');
  const ln = (a, b) => m.edge(m.vtx(s3(a)), m.vtx(s3(b)));
  const loop = (pts) => { const ids = pts.map(p => m.vtx(s3(p))); for (let i = 0; i < ids.length; i++) m.edge(ids[i], ids[(i + 1) % ids.length]); return ids; };

  m.part('body', { anchor: s3([0, 1.45, 0]) });
  m.piece('lower');
  const secs = [[2.25, 0.32, 0.68, 0.78], [2.05, 0.26, 0.84, 0.86], [1.5, 0.24, 0.9, 0.9], [0.95, 0.24, 0.98, 0.9], [0, 0.24, 1.0, 0.9], [-1.0, 0.24, 1.0, 0.9], [-1.85, 0.27, 1.02, 0.88], [-2.25, 0.36, 0.96, 0.78]];
  const R = secs.map(([x, y0, y1, hw]) => {
    const r = 0.08;
    return loop([[x, y0, -hw + r], [x, y0, hw - r], [x, y0 + r, hw], [x, y1 - r, hw], [x, y1, hw - r], [x, y1, -hw + r], [x, y1 - r, -hw], [x, y0 + r, -hw]]);
  });
  for (let k = 0; k < R.length - 1; k++) for (let i = 0; i < 8; i++) m.edge(R[k][i], R[k + 1][i]);
  for (let k = 0; k < R.length - 1; k++) { m.quad(R[k][3], R[k + 1][3], R[k + 1][4], R[k][4]); m.quad(R[k][7], R[k + 1][7], R[k + 1][6], R[k][6]); m.quad(R[k][4], R[k + 1][4], R[k + 1][5], R[k][5]); }
  // door seams, hood line
  for (const x of [0.9, -0.2, -1.3]) for (const s of [-1, 1]) ln([x, 0.3, s * 0.905], [x, 1.0, s * 0.905]);
  for (const s of [-1, 1]) ln([1.95, 0.86, s * 0.6], [0.98, 0.99, s * 0.6]);
  // headlights / tail lights
  for (const s of [-1, 1]) { loop([[2.2, 0.6, s * 0.5], [2.2, 0.6, s * 0.74], [2.14, 0.72, s * 0.72], [2.14, 0.72, s * 0.52]]); loop([[-2.22, 0.78, s * 0.5], [-2.22, 0.78, s * 0.72], [-2.2, 0.9, s * 0.72], [-2.2, 0.9, s * 0.5]]); }

  m.piece('cabin');
  const G = [[0.95, 0.98, 0.8], [-0.08, 1.43, 0.66], [-1.25, 1.43, 0.66], [-1.9, 1.02, 0.8]];
  const GL = G.map(([x, y, hw]) => [m.vtx(s3([x, y, -hw])), m.vtx(s3([x, y, hw]))]);
  for (let k = 0; k < 3; k++) for (const s of [0, 1]) m.edge(GL[k][s], GL[k + 1][s]);
  for (let k = 0; k < 4; k++) m.edge(GL[k][0], GL[k][1]);
  for (let i = 1; i < 6; i++) { const x = -0.08 + (-1.25 + 0.08) * i / 6; ln([x, 1.43, -0.66], [x, 1.43, 0.66]); }
  for (const s of [-1, 1]) { ln([0.9, 1.0, s * 0.86], [-0.06, 1.38, s * 0.7]); ln([-0.35, 1.0, s * 0.88], [-0.35, 1.42, s * 0.68]); ln([-1.2, 1.0, s * 0.88], [-1.2, 1.42, s * 0.68]); ln([-1.82, 1.03, s * 0.84], [-1.24, 1.4, s * 0.7]); ln([0.9, 1.0, s * 0.88], [-1.82, 1.03, s * 0.86]); }

  m.part('wheels', { anchor: s3([1.35, 0.64, -0.9]) });
  m.piece('whl');
  for (const x of [1.35, -1.35]) for (const s of [-1, 1]) {
    const c = s3([x, 0.32, s * 0.86]);
    m.ring(c, [0, 0, 1], 0.32 * S, 32, 0.2 * S);
    m.circle(c.map((v, i) => i === 2 ? v + s * 0.1 * S : v), [0, 0, 1], 0.2 * S, 24);
    m.circle(c.map((v, i) => i === 2 ? v + s * 0.1 * S : v), [0, 0, 1], 0.06 * S, 12);
  }

  m.part('windshield', { anchor: WS.tl, center: wsPoint(0.5, 0.5, 0) });
  m.piece('glass');
  const nu = 10, nv = 7;
  for (let i = 0; i <= nu; i++) m.edge(m.vtx(wsPoint(i / nu, 0, 0)), m.vtx(wsPoint(i / nu, 1, 0)));
  for (let j = 0; j <= nv; j++) m.edge(m.vtx(wsPoint(0, j / nv, 0)), m.vtx(wsPoint(1, j / nv, 0)));
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = m.vtx(wsPoint(i / nu, j / nv, 0)), b = m.vtx(wsPoint((i + 1) / nu, j / nv, 0)), c = m.vtx(wsPoint((i + 1) / nu, (j + 1) / nv, 0)), d = m.vtx(wsPoint(i / nu, (j + 1) / nv, 0));
    m.quad(a, b, c, d);
  }

  m.part('dash', { anchor: s3([0.78, 0.98, 0.3]), center: CAR.dash });
  m.piece('dsh');
  m.box(s3([0.72, 0.84, 0]), s3([0.36, 0.22, 1.6]));
  m.ring(s3([0.45, 0.95, -0.38]), [0.8, 0.6, 0], 0.18 * S, 28, 0.03 * S);
  ln([0.45, 0.95, -0.38], [0.62, 0.84, -0.38]);
  for (const z of [-0.5, -0.2, 0.2, 0.5]) loop([[0.9, 0.955, z - 0.1], [0.9, 0.955, z + 0.1], [0.86, 0.955, z + 0.1], [0.86, 0.955, z - 0.1]]);
  m.piece('cowlgrille');
  for (let i = 0; i < 12; i++) { const z = -0.7 + i * 1.4 / 11; ln([1.02, 0.975, z], [1.1, 0.96, z]); }

  m.part('driver', { anchor: s3([-0.42, 1.31, -0.38]), center: CAR.head });
  m.piece('head');
  const h = s3([-0.42, 1.18, -0.38]), hr = 0.1 * S;
  for (let k = 1; k < 4; k++) { const a = -Math.PI / 2 + Math.PI * k / 4; m.circle([h[0], h[1] + Math.sin(a) * hr, h[2]], [0, 1, 0], Math.cos(a) * hr, 20); }
  for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI; m.circle(h, [Math.cos(a), 0, Math.sin(a)], hr, 20); }
  m.piece('torso');
  m.tube(s3([-0.48, 0.62, -0.38]), s3([-0.46, 1.05, -0.38]), 0.14 * S, { rings: 4, seg: 12, longs: 6 });
  m.piece('seat');
  m.box(s3([-0.4, 0.52, -0.38]), s3([0.5, 0.1, 0.5]));
  m.box(s3([-0.7, 0.85, -0.38]), s3([0.1, 0.65, 0.5]));
  m.part('boots', { anchor: s3([0.55, 0.42, -0.38]), center: CAR.boot });
  m.piece('boot');
  for (const dz of [-0.09, 0.09]) m.box(s3([0.52, 0.33, -0.38 + dz]), s3([0.26, 0.1, 0.1]));

  return prepModel(m.toJSON());
}

// ---------- HVAC unit (stage units, flow left → right in the xy plane) ----------
export const HV = {
  fan: [-0.45, 0.75, 0], pivot: [-1.2, 1.2, 0], flapL: 0.4,
  evap: { x0: -0.02, x1: 0.1, y0: 0.35, y1: 1.15 }, heat: { x0: 0.42, x1: 0.52, y0: 0.42, y1: 1.1 },
  out: [0.9, 1.75, 0], drain: [[0.04, 0.3, 0], [0.04, 0.02, 0]],
};
export function hvac() {
  const m = new Model('hvac');
  const ln = (a, b) => m.edge(m.vtx(a), m.vtx(b));
  m.part('housing', { anchor: [1.1, 1.2, 0.22] });
  m.piece('hs');
  m.box([-0.075, 0.75, 0], [2.35, 0.9, 0.44]);
  m.box([-1.0, 1.4, 0], [0.4, 0.4, 0.44]);
  m.box([0.9, 1.475, 0], [0.24, 0.55, 0.44]);
  for (const z of [-0.22, 0.22]) { ln([-1.25, 0.8, z], [-1.25, 1.2, z]); }
  m.piece('drain');
  m.tube(HV.drain[0], HV.drain[1], 0.035, { rings: 4, seg: 10, longs: 4 });

  m.part('flap', { anchor: [-0.8, 1.25, 0.22], center: HV.pivot });
  m.piece('flp', { axis: { c: HV.pivot, d: [0, 0, 1] } });
  m.box([HV.pivot[0] + HV.flapL / 2, HV.pivot[1], 0], [HV.flapL, 0.025, 0.4]);
  m.tube([HV.pivot[0], HV.pivot[1], -0.23], [HV.pivot[0], HV.pivot[1], 0.23], 0.02, { rings: 3, seg: 8, longs: 4 });

  m.part('fan', { anchor: [-0.45, 1.08, 0.2], center: HV.fan });
  m.piece('blades', { axis: { c: HV.fan, d: [0, 0, 1] } });
  const c = HV.fan;
  for (const z of [-0.15, 0.15]) { m.circle([c[0], c[1], z], [0, 0, 1], 0.3, 40); m.circle([c[0], c[1], z], [0, 0, 1], 0.12, 20); }
  for (let i = 0; i < 18; i++) {
    const a = i / 18 * TAU, b = a + 0.35;
    for (const z of [-0.15, 0.15]) ln([c[0] + Math.cos(a) * 0.12, c[1] + Math.sin(a) * 0.12, z], [c[0] + Math.cos(b) * 0.3, c[1] + Math.sin(b) * 0.3, z]);
    ln([c[0] + Math.cos(b) * 0.3, c[1] + Math.sin(b) * 0.3, -0.15], [c[0] + Math.cos(b) * 0.3, c[1] + Math.sin(b) * 0.3, 0.15]);
  }
  m.tube([c[0], c[1], -0.2], [c[0], c[1], 0.2], 0.04, { rings: 3, seg: 10, longs: 4 });

  const slab = (id, B, n) => {
    m.part(id, { anchor: [(B.x0 + B.x1) / 2, B.y1 + 0.05, 0.2], center: [(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, 0] });
    m.piece(id + 'S');
    m.box([(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, 0], [B.x1 - B.x0, B.y1 - B.y0, 0.38]);
    for (let i = 1; i < n; i++) { const y = B.y0 + (B.y1 - B.y0) * i / n; ln([B.x1, y, -0.19], [B.x1, y, 0.19]); ln([B.x0, y, -0.19], [B.x0, y, 0.19]); }
    for (let i = 1; i < 6; i++) { const z = -0.19 + 0.38 * i / 6; ln([B.x1, B.y0, z], [B.x1, B.y1, z]); }
  };
  slab('evap', HV.evap, 14);
  slab('heater', HV.heat, 11);
  return prepModel(m.toJSON());
}
// flow paths (world xy, z = 0)
export const PATH = {
  recirc: [[-1.6, 1.0], [-1.05, 1.0], [-0.62, 0.86], [-0.2, 0.75], [0.04, 0.75], [0.3, 0.76], [0.47, 0.78], [0.72, 0.85], [0.9, 1.05], [0.9, 1.9]],
  fresh: [[-1.0, 2.05], [-1.0, 1.15], [-0.75, 0.92], [-0.2, 0.75], [0.04, 0.75], [0.3, 0.76], [0.47, 0.78], [0.72, 0.85], [0.9, 1.05], [0.9, 1.9]],
};
