/* ===== DIALOG / OVERLAY =====
   Semua dialog memakai satu overlay (#ov). Tombol di dalam dialog ditulis
   sebagai <button data-action="nama"> lalu dihubungkan ke fungsi lewat objek `actions`. */
import { SCORE, SPEEDS } from '../data/config.js';
import { LEVELS } from '../data/levels.js';
import { CHARACTERS } from '../data/sprites.js';
import { remainingCost } from '../logic/prim.js';
import { game } from '../logic/state.js';
import { $ } from './dom.js';

let currentActions = {};

export function openDialog(html, actions = {}) {
  $('ovc').innerHTML = html;
  currentActions = actions;
  $('ov').classList.add('open');
}

export function closeDialog() {
  $('ov').classList.remove('open');
  currentActions = {};
}

export const isDialogOpen = () => $('ov').classList.contains('open');

// Satu listener untuk semua tombol dialog
$('ovc').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (btn) currentActions[btn.dataset.action]?.(btn.dataset);
});

/* ---------- Pilih level ---------- */

export function showLevelSelect({ onSelect }) {
  const levelButtons = LEVELS.map((l, i) =>
    `<button class="btn" data-action="level" data-i="${i}"><span>${l.name}</span><span>${Object.keys(l.n).length} node</span></button>`
  ).join('');

  openDialog(`
    <h2>PILIH LEVEL</h2>
    <div class="lv">
      ${levelButtons}
      <button class="btn" data-action="level" data-i="-1"><span>LEVEL ACAK</span><span>baru tiap main</span></button>
    </div>
    <div class="row"><button class="btn" data-action="close">BATAL</button></div>
  `, {
    level: (d) => onSelect(Number(d.i)),
    close: closeDialog,
  });
}

/* ---------- Pengaturan ---------- */

export function showSettings({ onCharacter, onSpeed }) {
  const selected = (isSelected) => (isSelected ? ' is-selected' : '');

  const characters = Object.entries(CHARACTERS).map(([id, c]) =>
    `<button class="btn${selected(game.character === id)}" data-action="character" data-id="${id}">${c.name}</button>`
  ).join('');

  const speeds = SPEEDS.map((s) =>
    `<button class="btn${selected(game.stepMs === s.ms)}" data-action="speed" data-ms="${s.ms}">${s.label}</button>`
  ).join('');

  openDialog(`
    <h2>PENGATURAN</h2>
    <p>Karakter:</p><div class="row">${characters}</div>
    <p>Kecepatan jalan:</p><div class="row">${speeds}</div>
  `, {
    character: (d) => { onCharacter(d.id); closeDialog(); },
    speed: (d) => { onSpeed(Number(d.ms)); closeDialog(); },
  });
}

/* ---------- Hasil permainan ---------- */

/** result = hasil dari calculateResult(); actions = { restart, next, menu } */
export function showResult(result, { onRestart, onNext, onMenu, hasNext }) {
  const { win, stars, score, extra, mst, used } = result;
  const S = game.state;
  const total = S.g.nodes.length;
  const connected = S.g.nodes.filter((n) => n.vis).length;

  const title = win
    ? `<h2 style="color:#2e9b4a">MENANG! ${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</h2>`
    : '<h2 style="color:#d9444d">KALAH</h2>';

  const summary = !win
    ? `Budget tersisa ${S.budget}, padahal minimal butuh ${remainingCost(S.g)} lagi untuk menyambung ${total - connected} node yang tersisa. Pilihan edge sebelumnya terlalu boros, jadi MST tidak mungkin dicapai.`
    : extra <= 0
      ? 'Semua Poké Ball terhubung dengan pohon optimal: bobotnya sama dengan MST!'
      : `Semua Poké Ball terhubung, tetapi pohonmu ${extra} lebih berat dari MST.`;

  openDialog(`
    ${title}
    <p>${summary}</p>
    <div class="cmp">
      <div>Bobot MST (target)<b>${mst}</b></div>
      <div>Bobot pohonmu<b>${used}</b></div>
      <div>Selisih<b>${win ? (extra >= 0 ? '+' : '') + extra : '–'}</b></div>
      <div>Skor<b>${score}</b></div>
      <div>Node terhubung<b>${connected} / ${total}</b></div>
      <div>Siklus ditolak<b>${S.bounces}</b></div>
    </div>
    <p>Skor = maks(0, ${SCORE.base} − ${SCORE.perExtraWeight} × selisih bobot − ${SCORE.perHint} × petunjuk (${S.hints})).</p>
    <p><b>Pohon rentang:</b> menghubungkan semua V node dengan tepat V−1 = ${total - 1} edge dan <b>tanpa siklus</b>. Edge yang menutup siklus pasti ditolak, itulah yang membuat karakter terpental. MST adalah pohon rentang dengan total bobot minimum.</p>
    <p><b>Strategi:</b> pada tiap langkah, ambil edge termurah yang menyambung pohonmu ke node baru (algoritma Prim).</p>
    <div class="row">
      <button class="btn" data-action="restart">ULANGI</button>
      ${hasNext ? '<button class="btn" data-action="next">LANJUT</button>' : ''}
      <button class="btn" data-action="menu">MENU</button>
    </div>
  `, { restart: onRestart, next: onNext, menu: onMenu });
}
