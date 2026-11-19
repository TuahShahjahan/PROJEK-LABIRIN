/* ===== RENDER CANVAS =====
   Hanya menggambar. Tidak mengubah state game. */
import { TILE_SIZE as TS } from '../data/config.js';
import { getCharacterImage, getTreeImage } from '../data/sprites.js';
import { candidateCosts } from '../logic/prim.js';
import { game } from '../logic/state.js';
import { $ } from './dom.js';

const canvas = $('cv');
const ctx = canvas.getContext('2d');

const COLOR = {
  ground: ['#ead49a', '#f1deae'],
  edgeIdle: '#b08a4a', edgeMst: '#2e9b4a', edgeRejected: '#d9444d', edgeBlocked: '#9d9486',
  edgeChecking: '#ffd83b', edgeFlash: '#ff2d2d',
  playerTree: '#2f6fe0', hint: '#8a4dff',
  label: '#243d63', labelBorder: '#fffdee', weightText: '#264b4c',
};

/** Pusat tile / node dalam piksel. */
const center = (n) => [n.x * TS + TS / 2, n.y * TS + TS / 2];

export function resizeCanvas(g) {
  canvas.width = g.W * TS;
  canvas.height = g.H * TS;
}

/** Posisi node dari klik/tap pada canvas (null jika tidak kena node). */
export function nodeAtPointer(e) {
  const S = game.state;
  if (!S) return null;
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) * canvas.width) / r.width;
  const y = ((e.clientY - r.top) * canvas.height) / r.height;
  return S.g.nodes.find((n) => Math.hypot(n.x * TS + TS / 2 - x, n.y * TS + TS / 2 - y) < TS * 0.6) || null;
}

/* ---------- Bagian-bagian gambar ---------- */

function drawGround(g) {
  for (let y = 0; y < g.H; y++) {
    for (let x = 0; x < g.W; x++) {
      if (g.grid[y][x]) {
        ctx.fillStyle = COLOR.ground[(x + y) % 2];
        ctx.fillRect(x * TS, y * TS, TS, TS);
      } else {
        ctx.drawImage(getTreeImage(), x * TS, y * TS, TS, TS);
      }
    }
  }
}

function drawHintPath(S) {
  if (!S.hint || S.hint.path.length < 2) return;
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = COLOR.hint;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  S.hint.path.forEach((id, i) => {
    const [x, y] = center(S.g.by[id]);
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

/** Warna edge: kedip merah saat siklus, lalu menurut statusnya. */
function makeEdgeStyle(S, ts) {
  const flash = S.flash && ts - S.flash.t0 < 800 ? S.flash : null;
  const isFlashing = (e) => flash && flash.id === e.id && Math.floor((ts - flash.t0) / 100) % 2 === 0;
  const color = (e) =>
    isFlashing(e) ? COLOR.edgeFlash
    : e.cur ? COLOR.edgeChecking
    : e.st === 'mst' ? COLOR.edgeMst
    : e.st === 'rej' ? COLOR.edgeRejected
    : e.blocked ? COLOR.edgeBlocked
    : COLOR.edgeIdle;
  return { isFlashing, color };
}

function drawEdges(S, style) {
  S.g.edges.forEach((e) => {
    const [ax, ay] = center(S.g.by[e.a]), [bx, by] = center(S.g.by[e.b]);
    const solid = style.isFlashing(e) || e.st === 'mst' || e.cur;

    ctx.strokeStyle = style.color(e);
    ctx.lineWidth = style.isFlashing(e) ? 9 : e.cur || e.st === 'mst' ? 7 : 4;
    ctx.setLineDash(solid ? [] : [8, 6]);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.setLineDash([]);
  });
}

/** Garis biru = pohon buatan pemain (hanya edge yang ditempuh dengan biaya). */
function drawPlayerTree(S, ts) {
  const segments = S.trail.slice();
  if (S.mv && S.mv.claim) { // segmen yang sedang berjalan (animasi)
    const t = Math.min(1, (ts - S.mv.t0) / S.mv.dur), m = S.mv;
    segments.push([m.fx, m.fy, m.fx + (m.tx - m.fx) * t, m.fy + (m.ty - m.fy) * t]);
  }
  ctx.strokeStyle = COLOR.playerTree;
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  segments.forEach(([x1, y1, x2, y2]) => {
    ctx.moveTo(x1 * TS + TS / 2, y1 * TS + TS / 2);
    ctx.lineTo(x2 * TS + TS / 2, y2 * TS + TS / 2);
  });
  ctx.stroke();
  ctx.lineCap = 'butt';
}

/** Kotak angka bobot di tengah tiap edge. */
function drawWeights(S, style) {
  ctx.font = 'bold 12px system-ui';
  S.g.edges.forEach((e) => {
    const [ax, ay] = center(S.g.by[e.a]), [bx, by] = center(S.g.by[e.b]);
    const mx = (ax + bx) / 2, my = (ay + by) / 2;
    ctx.fillStyle = '#fffdee';
    ctx.strokeStyle = style.color(e);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(mx - 11, my - 10, 22, 20, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COLOR.weightText;
    ctx.fillText(e.w, mx, my + 1);
  });
}

function drawVisitedNode(x, y, r) {
  ctx.fillStyle = '#f2b705'; ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.arc(x, y, r - 2, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2e9b4a'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x - 1, y + 5); ctx.lineTo(x + 6, y - 5); ctx.stroke();
}

function drawPokeball(x, y, r) {
  ctx.fillStyle = '#d9444d'; ctx.beginPath(); ctx.arc(x, y, r, Math.PI, 0); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI); ctx.fill();
  ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill(); ctx.stroke();
}

function drawNodes(S, ts) {
  const costs = !S.over ? candidateCosts(S.g) : null;
  const minCost = costs ? Math.min(...Object.values(costs).filter((v) => v != null)) : 0;
  const r = 12;

  S.g.nodes.forEach((n) => {
    const [x, y] = center(n);
    n.vis ? drawVisitedNode(x, y, r) : drawPokeball(x, y, r);

    // Huruf node
    ctx.font = 'bold 15px system-ui';
    ctx.fillStyle = COLOR.label; ctx.strokeStyle = COLOR.labelBorder; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x - 12, y - r - 22, 24, 20, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.fillText(n.id, x, y - r - 11.5);

    // Cincin berdenyut pada node tujuan petunjuk
    if (S.hint && S.hint.v === n.id) {
      const t = (ts % 900) / 900;
      ctx.strokeStyle = COLOR.hint; ctx.lineWidth = 3; ctx.globalAlpha = 1 - t;
      ctx.beginPath(); ctx.arc(x, y, r + 4 + t * 12, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Lencana bobot termurah menuju node yang belum terhubung
    if (costs && !n.vis) {
      const cost = costs[n.id];
      ctx.fillStyle = cost == null ? '#8a8a8a' : S.showDist && cost === minCost ? '#2e9b4a' : '#35609e';
      ctx.beginPath(); ctx.roundRect(x - 13, y + r + 3, 26, 15, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui';
      ctx.fillText(cost == null ? '–' : cost, x, y + r + 11);
    }
  });
}

/** Efek ledakan saat node baru terhubung. */
function drawEffects(S, ts) {
  S.fx = S.fx.filter((f) => ts - f.t0 < 600);
  S.fx.forEach((f) => {
    const t = (ts - f.t0) / 600, x = f.x * TS + TS / 2, y = f.y * TS + TS / 2;
    ctx.globalAlpha = 1 - t;
    ctx.fillStyle = ctx.strokeStyle = '#ffd83b';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, 12 + t * 24, 0, 7); ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ctx.fillRect(x + Math.cos(a) * (8 + t * 30) - 2, y + Math.sin(a) * (8 + t * 30) - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  });
}

function drawPlayer(S, ts) {
  let px = S.px, py = S.py, bob = 0;
  if (S.mv) {
    const t = Math.min(1, (ts - S.mv.t0) / S.mv.dur);
    px = S.mv.fx + (S.mv.tx - S.mv.fx) * t;
    py = S.mv.fy + (S.mv.ty - S.mv.fy) * t;
    bob = Math.abs(Math.sin(t * Math.PI)) * 5;
  }
  if (S.pop && S.pop.text === 'SIKLUS!' && ts - S.pop.t0 < 500) px += Math.sin(ts / 22) * 0.07; // getar

  const size = TS * 1.25;
  ctx.fillStyle = 'rgba(0,0,0,.2)'; // bayangan
  ctx.beginPath(); ctx.ellipse(px * TS + TS / 2, py * TS + TS - 4, 12, 4, 0, 0, 7); ctx.fill();
  ctx.drawImage(getCharacterImage(game.character, S.dir), px * TS + TS / 2 - size / 2, py * TS + TS - size + 2 - bob, size, size);
}

/** Gelembung teks ("Tembok!", "SIKLUS!", ...) di atas pemain. */
function drawPopup(S, ts) {
  if (!S.pop || ts - S.pop.t0 >= 900) return;
  const t = (ts - S.pop.t0) / 900, x = S.pop.x * TS + TS / 2, y = S.pop.y * TS - 10 - t * 14;

  ctx.globalAlpha = 1 - t * 0.6;
  ctx.font = 'bold 13px system-ui';
  const w = ctx.measureText(S.pop.text).width + 16;
  ctx.fillStyle = S.pop.text === 'SIKLUS!' ? '#d9444d' : COLOR.label;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - 11, w, 22, 6); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillText(S.pop.text, x, y + 1);
  ctx.globalAlpha = 1;
}

/* ---------- Gambar satu frame ---------- */

export function draw(ts) {
  const S = game.state;
  if (!S) return;

  ctx.imageSmoothingEnabled = false;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const style = makeEdgeStyle(S, ts);
  drawGround(S.g);
  drawHintPath(S);
  drawEdges(S, style);
  drawPlayerTree(S, ts);
  drawWeights(S, style);
  drawNodes(S, ts);
  drawEffects(S, ts);
  drawPlayer(S, ts);
  drawPopup(S, ts);
}
