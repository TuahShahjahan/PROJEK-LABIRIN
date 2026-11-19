/* ===== PEMAIN: membangun pohon rentang (spanning tree) edge demi edge =====
   Satu tekanan arah = menyusuri SATU edge (koridor) dari node tempat berdiri:
   - edge baru ke node belum dikunjungi -> dipasang ke pohon, biaya 1 budget per tile (= bobot edge)
   - edge yang sudah ada di pohon       -> boleh dilewati lagi GRATIS (pindah cabang)
   - edge ke node yang sudah terhubung  -> membentuk SIKLUS: ditolak, pemain terpental (gratis) */
import { DIRECTIONS, OPPOSITE } from '../data/config.js';
import { bestEdge } from './prim.js';
import { calculateResult } from './score.js';
import { game, hooks, session } from './state.js';

const state = () => game.state;
const isBusy = () => state().mv || state().steps.length > 0;
const currentNode = () => state().g.by[state().last];

/* ---------- Utilitas ---------- */

function popup(text, ts = performance.now()) {
  const S = state();
  S.pop = { t0: ts, x: S.px, y: S.py, text };
}

/** Jalur node-ke-node lewat edge yang sudah dipasang (BFS). Dipakai untuk garis petunjuk. */
function treePath(from, to) {
  const S = state();
  const prev = { [from]: null };
  const queue = [from];

  while (queue.length) {
    const x = queue.shift();
    if (x === to) break;
    S.g.edges.forEach((e) => {
      if (!e.claimed) return;
      const y = e.a === x ? e.b : e.b === x ? e.a : null;
      if (y && !(y in prev)) { prev[y] = x; queue.push(y); }
    });
  }
  const path = [];
  for (let x = to; x != null; x = prev[x]) path.push(x);
  return path.reverse();
}

/* ---------- Input pemain ---------- */

/** Perintah arah dari keyboard / tombol layar. */
export function command(dir) {
  const S = state();
  if (!S || S.over) return;
  if (isBusy()) { S.pend = dir; return; } // simpan, jalankan setelah langkah sekarang selesai
  go(dir);
}

/** Klik node tetangga = sama seperti menekan tombol arah ke node itu. */
export function travelTo(nodeId) {
  const S = state();
  if (!S || S.over || isBusy() || nodeId === S.last) return;

  const from = currentNode(), to = S.g.by[nodeId];
  const connected = S.g.edges.some((e) =>
    (e.a === from.id && e.b === to.id) || (e.b === from.id && e.a === to.id));
  if (!connected) { popup('Belum Terhubung'); return; }

  if (to.x > from.x) go('r');
  else if (to.x < from.x) go('l');
  else if (to.y > from.y) go('d');
  else if (to.y < from.y) go('u');
}

/** Susun antrean langkah untuk menyusuri satu edge ke arah `dir`. */
function go(dir) {
  const S = state(), n = currentNode(), link = S.g.out[n.id][dir];
  S.dir = dir;
  if (!link) { popup('Tembok!'); return; }

  const { e, to: toId } = link, to = S.g.by[toId], w = e.w, [dx, dy] = DIRECTIONS[dir];
  const kind = e.claimed ? 'free' : to.vis ? 'cycle' : 'claim';

  if (kind === 'claim' && S.budget < w) { popup('Budget kurang!'); return; }

  const steps = [];
  const tiles = kind === 'cycle' ? w - 1 : w; // siklus: berhenti 1 tile sebelum node tujuan
  let x = n.x, y = n.y;

  for (let i = 0; i < tiles; i++) {
    steps.push({ fx: x, fy: y, tx: x + dx, ty: y + dy, cost: kind === 'claim' ? 1 : 0, claim: kind === 'claim', dir, fast: kind === 'free' });
    x += dx; y += dy;
  }

  if (kind === 'cycle') { // menabrak lalu terpental balik
    steps.push({ pop: 'SIKLUS!', edge: e, from: n.id, to: to.id });
    for (let i = 0; i < tiles; i++) {
      steps.push({ fx: x, fy: y, tx: x - dx, ty: y - dy, cost: 0, dir: OPPOSITE[dir], fast: true });
      x -= dx; y -= dy;
    }
  } else {
    steps.push({ arrive: to.id, edge: e, kind });
  }
  S.steps = steps;
}

/* ---------- Loop animasi ---------- */

/** Satu tile selesai dijalani. */
export function arrive() {
  const S = state(), m = S.mv;
  S.px = m.tx; S.py = m.ty; S.mv = null;
  if (m.cost) { S.used += m.cost; S.budget -= m.cost; }
  if (m.claim) S.trail.push([m.fx, m.fy, m.tx, m.ty]);
  hooks.change();
}

/** Tiba di ujung edge. */
function finishEdge(step) {
  const S = state(), to = S.g.by[step.arrive], e = step.edge;

  if (step.kind === 'claim') {
    e.claimed = true;
    to.vis = true;
    session.balls++;
    S.fx.push({ x: to.x, y: to.y, t0: performance.now() });
  }
  S.last = to.id;

  if (S.hint) {
    if (S.hint.e.claimed || S.g.by[S.hint.v].vis) S.hint = null;
    else refreshHintPath();
  }
  hooks.message(S.hint ? S.hint.msg : '');
  hooks.change();

  if (S.g.nodes.every((n) => n.vis)) finishGame(true);
  else if (!S.g.edges.some((x) => S.g.by[x.a].vis !== S.g.by[x.b].vis && x.w <= S.budget)) finishGame(false);
}

/** Jalankan antrean langkah; dipanggil tiap frame. */
export function pump(ts) {
  const S = state();

  while (!S.mv && S.steps.length) {
    const step = S.steps.shift();

    if (step.pop) { // terpental karena siklus
      popup(step.pop, ts);
      S.flash = { id: step.edge.id, t0: ts };
      step.edge.blocked = true;
      S.bounces++;
      hooks.message(`<b>Siklus!</b> Edge ${step.from}–${step.to} menghubungkan dua node yang sudah terhubung di pohonmu, jadi ditolak (akan membentuk siklus). Pemain terpental, budget tidak berkurang.`);
      hooks.change();
      continue;
    }
    if (step.arrive) {
      finishEdge(step);
      if (S.over) return;
      continue;
    }
    step.t0 = ts;
    step.dur = step.fast ? game.stepMs * 0.55 : game.stepMs;
    S.mv = step;
    S.dir = step.dir;
  }

  if (!S.mv && !S.steps.length && !S.over && S.pend) {
    const dir = S.pend;
    S.pend = null;
    go(dir);
  }
}

/* ---------- Petunjuk ---------- */

function refreshHintPath() {
  const h = state().hint;
  h.path = treePath(state().last, h.u).concat([h.v]);
}

export function requestHint() {
  const S = state();
  if (!S || S.over) return;
  const e = bestEdge(S.g);
  if (!e) return;

  const u = S.g.by[e.a].vis ? e.a : e.b;
  const v = u === e.a ? e.b : e.a;
  S.hints++;
  S.hint = {
    e, u, v, path: [],
    msg: `💡 Pasang edge <b>${u}–${v}</b> (bobot <b>${e.w}</b>): edge termurah yang menyambung pohonmu ke node baru dan tidak membentuk siklus. Petunjuk terpakai: ${S.hints} (−50 skor/petunjuk).`,
  };
  refreshHintPath();
  hooks.message(S.hint.msg);
  hooks.change();
}

/* ---------- Akhir permainan ---------- */

function finishGame(win) {
  const S = state();
  S.over = true;
  S.mv = null;
  S.steps = [];
  S.pend = null;
  S.hint = null;

  // Tandai edge MST hasil Prim (terlihat samar di belakang dialog hasil)
  S.g.edges.forEach((e) => { e.st = null; e.cur = false; });
  S.mst.edges.forEach((e) => { e.st = 'mst'; });

  const result = calculateResult(S, win);
  session.coins += result.stars;
  hooks.finish(result);
}
