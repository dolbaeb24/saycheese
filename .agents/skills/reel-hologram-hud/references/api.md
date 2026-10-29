# API движка hologram-hud (engine/holo.js, engine/hud.js, models/mkmodel.mjs)

## Модели: `models/mkmodel.mjs`

```js
import { Model } from './models/mkmodel.mjs';
import { prepModel } from './engine/holo.js';
const m = new Model('hvac');
m.part('evap', { anchor: [x, y, z], center?: [..], tagDir?: .. });   // деталь: её захватывает рамка (info.bbox.evap)
m.piece('evapS', { axis?: { c: [..], d: [0, 0, 1] }, explode?: [dx, dy, dz], internal?, hot? });  // кусок внутри детали
const a = m.vtx([x, y, z]); m.edge(a, b); m.quad(a, b, c, d);   // примитивы
m.box(center, size); m.tube(a, b, r, { rings, seg, longs }); m.ring(c, n, r, seg, width);
m.disc(c, n, r); m.circle(c, n, r, seg); m.wheel(c, R, o); m.cells(...); m.board(...); m.rotor(...);
export const hvac = () => prepModel(m.toJSON());
```

- Нормализации нет: единицы сцены выбираешь сам (машина — в метрах × 0.55, агрегат — в условных единицах около 1).
- `quad` задаёт грани для заливки `solid` (Френель плюс строки развёртки).
- Ось `axis` у куска позволяет вращать его через `angle: {pieceId: радианы}` вокруг `axis.c` по направлению `axis.d`.
- `modelFromPath(pts, {depth, slices, id})` выдавливает 2D-контур в каркас.

## Камера

```js
{ target: [x, y, z], yaw, pitch, dist, fov: 0.6, cx: 500, cy: 900, roll: 0 }
// глаз = target + dist * (sin yaw·cos pitch, sin pitch, cos yaw·cos pitch)
// cx, cy — где на экране стоит target (сдвинь влево или вверх, чтобы освободить место для текста)
```

`mixCam(A, B, w)` в `film.js` интерполирует target, yaw и pitch линейно, а dist — логарифмически.

## `new Holo(W, H).draw(ctx, model, cam, opts)` → `{ bbox: {partId: [x0, y0, x1, y1]}, anchor, project(x, y, z, out3) }`

| opts | Смысл |
|---|---|
| `hue` | основной тон (0–360) |
| `scan: {y, band = 0.06}` | рисовать только ниже высоты y, фронт светится белым (проявление) |
| `scanDown: {y}` | стирание сверху вниз (финал сцены) |
| `explode: {id: 0–1}` | разлёт детали или куска по его вектору `explode` |
| `angle: {pieceId: rad}` | поворот куска вокруг его оси |
| `spin`, `spinC` | вращение всей модели вокруг вертикали (поворотный стол) |
| `solid: 0–1` | заливка граней голограммой (нужны `quad`) |
| `focus: partId`, `dim: 0–1` | остальные детали притушены до `dim` |
| `only: [partId]` | рисовать только эти детали (второй проход) |
| `keep: {pieceId: '#hex'}` | собственный цвет куска; заливка работает только при `solid > 0` |
| `flash: {partId: 1}` | деталь целиком белая (вспышка на захвате, 3 кадра) |
| `wave: {y, w}` | световая волна по высоте |
| `gain`, `glow`, `lineWidth`, `alpha` | общая яркость, свечение, толщина линий |
| `scanOffset` | сдвиг текстуры строк развёртки (`t * 24`) |

Экранная точка из 3D: `const P3 = new Float32Array(3); info.project(x, y, z, P3); // P3[0], P3[1]`.

## Сцена

- `drawPad(ctx, cam, W, H, {hue, rot, alpha, y, c})` — подставка-проектор.
- `drawScanPlane(ctx, cam, W, H, y, {hue, r, c, rot, alpha})` — плоскость сканирования на высоте y.
- `U.background(ctx, W, H, T, {px, py, cx, cy, alpha})` — фон: тёмное поле, свечение и точечная сетка с параллаксом (px, py берутся от yaw и pitch камеры).
- `U.vignette(ctx, W, H, k)`.

## HUD (`import * as U from './engine/hud.js'`)

- `T = U.theme(hue, accent)` → `T.line(a)`, `T.hi(a)`, `T.dim(a)`, `T.acc(a)`, `T.bg0`, `T.bg1`.
- `U.plate(ctx, T, x, y, w, h, a, {op})` — тёмная плашка с рамкой и уголками.
- `U.corners(ctx, x0, y0, x1, y1, L)` — уголки видоискателя (рисуй по безопасной зоне).
- `U.targetBox(ctx, T, bbox, k, {flash, tag, pad, lockK, alpha})` — рамка захвата; `k` от 0 до 1 за 0.22 с до слова; ярлык `tag` появляется после лока.
- `U.leader(ctx, T, from, elbow, to, prog, {alpha})` — выноска с изломом.
- `U.rollText(str, k, frame, seed)` — строка «прокручивается» мусорными символами, буквы фиксируются справа налево.
- `U.specCard(ctx, T, x, y, {label, value, unit, detail}, {reveal, roll, detail, frame, flash}, {w, big, index, alpha})` — карточка значения. `roll < 1` — цифры в основном цвете (прокрутка), `roll = 1` — значение в акценте. Живой счётчик: `roll: 0.999` до лока.
- `U.chip(ctx, T, x, y, {label, value, detail?}, a, {w, index})` — чип итогов.
- `U.subtitle(ctx, W, H, T, text, a, {y, maxW, x, t})` — субтитр-HUD с «голосовыми» полосками.
- `U.marker(ctx, T, [x, y], label, a, pulse, dir)`, `U.beam(...)`, `U.glitch(ctx, W, H, amt, seed)` (не больше одного раза за ролик, на самом большом изменении).
- `U.FONT = {ui: 'Exo2', mono: 'JBMono'}`, `U.wrap(ctx, text, maxW)`, `U.fitFont(...)`.

## Помощники в film.js образца

- `seg(t, a, b)` — от 0 до 1 между a и b; `win(t, a, b, in, out)` — окно появления и исчезновения; `eo`, `eio`, `sine` — сглаживания; `hash(i)` — детерминированный «случайный» в [0, 1).
- `flashAt(t, tk)` — истина в течение 3 кадров после `tk`.
- `labelPlate(ctx, x, y, text, a, anchor = 'up' | 'mid' | 'down' + 'R', big, col)` — плашка-подпись, прижатая к `SAFE`. Суффикс `R` выравнивает её по правому краю к x.
- `card(ctx, t, frame, x, y, content, {r0, l0, l1, d0}, out, opts)` — карточка по расписанию: появление в r0, прокрутка от l0 до l1 (лок), подробность в d0, `out` — множитель исчезновения.
- `ev(t, kind, {d, v})` — добавить звуковое событие.
- `chrome(ctx, t, frame)` — уголки по безопасной зоне, номер и название сцены, таймер.
- `subs(ctx, t)` — субтитры из `CUES` с плавным входом и выходом.
