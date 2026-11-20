/* ===== DIALOG / OVERLAY =====
   Semua dialog memakai satu overlay (#ov). Tombol di dalam dialog ditulis
   sebagai <button data-action="nama"> lalu dihubungkan ke fungsi lewat objek `actions`. */
import { SCORE, SPEEDS } from '../data/config.js';
import { LEVELS } from '../data/levels.js';
import { CHARACTERS, getCharacterImage } from '../data/sprites.js';
import { remainingCost } from '../logic/prim.js';
import { game } from '../logic/state.js';
import { $ } from './dom.js';
import { getTheme, setTheme } from './theme.js';
import { getStars, saveStars } from '../logic/progress.js';

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

// Warna kotak nomor tiap level (makin ke bawah makin sulit); berulang kalau level bertambah
const LEVEL_COLORS = ['#4a9d52', '#2f86c9', '#8a4dff', '#e8892b', '#d9444d', '#d6479b', '#c79a00', '#243d63'];

const starRow = (n) => [1, 2, 3].map((i) => `<span class="${i <= n ? 'on' : 'off'}">★</span>`).join('');

export function showLevelSelect({ onSelect }) {
  const cards = LEVELS.map((l, i) => {
    const [head, ...rest] = l.name.split(' · '); // "LEVEL 1" · "BEGINNER"
    const desc = rest.join(' · ') || head;
    const num = (head.match(/\d+/) || [i + 1])[0];
    const stars = getStars(l.name);
    const nodes = Object.keys(l.n).length;
    return `
      <button class="lv-card${stars === 3 ? ' perfect' : ''}" style="--c:${LEVEL_COLORS[i % LEVEL_COLORS.length]}" data-action="level" data-i="${i}"
        aria-label="${head} ${desc}, ${stars} dari 3 bintang, ${nodes} node">
        <span class="lv-num">${num}</span>
        <span class="lv-info">
          <b class="lv-desc">${desc}</b>
          <span class="lv-stars">${starRow(stars)}</span>
          <span class="lv-meta"><i class="lv-ball"></i>${nodes} NODE</span>
        </span>
      </button>`;
  }).join('');

  const got = LEVELS.reduce((sum, l) => sum + getStars(l.name), 0);

  openDialog(`
    <div class="lv-dlg">
      <div class="lv-head">
        <h2>PILIH LEVEL</h2>
        <p>★ ${got} / ${LEVELS.length * 3} bintang terkumpul</p>
        <button class="lv-close" data-action="close" aria-label="Tutup">✕</button>
      </div>
      <div class="lv-body">
        <div class="lv-grid">
          ${cards}
          <button class="lv-card lv-rand" data-action="level" data-i="-1" aria-label="Level acak, peta baru tiap main">
            <span class="lv-num">?</span>
            <span class="lv-info">
              <b class="lv-desc">LEVEL ACAK</b>
              <span class="lv-sub">Peta baru tiap main · 6–15 node</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  `, {
    level: (d) => onSelect(Number(d.i)),
    close: closeDialog,
  });
}

/* ---------- Pengaturan ---------- */

const CHARACTER_COLORS = ['#2f9e8f', '#e0a800', '#2f86c9', '#8a4dff', '#d6479b'];
const SPEED_COLORS = ['#4a9d52', '#2f86c9', '#d9444d'];
const THEMES = [
  { mode: 'light', icon: '☀', label: 'TERANG', color: '#e8a400' },
  { mode: 'dark', icon: '☾', label: 'GELAP', color: '#5b7fd1' },
];

/** Tombol pilihan; `selected` menentukan tanda ✓ dan warna. */
const option = (action, attr, color, selected, html, extraClass = '') =>
  `<button class="set-opt ${extraClass}${selected ? ' is-selected' : ''}" style="--c:${color}" data-action="${action}" ${attr} aria-pressed="${selected}">${html}</button>`;

/** Perbarui tanda terpilih tanpa membangun ulang dialog (fokus keyboard tidak hilang). */
function markSelected(action, key, value) {
  document.querySelectorAll(`#ovc [data-action="${action}"]`).forEach((b) => {
    const on = b.dataset[key] === String(value);
    b.classList.toggle('is-selected', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

export function showSettings({ onCharacter, onSpeed }) {
  const characters = Object.entries(CHARACTERS).map(([id, c], i) => {
    const type = c.info.split('·')[1]?.trim() || '';
    return option('character', `data-id="${id}"`, CHARACTER_COLORS[i % CHARACTER_COLORS.length], game.character === id,
      `<img class="set-sprite" src="${getCharacterImage(id, 'd').src}" alt="">
       <span class="set-text"><b class="set-name">${c.name}</b><small class="set-type">${type}</small></span>`, 'set-char');
  }).join('');

  const speeds = SPEEDS.map((s, i) =>
    option('speed', `data-ms="${s.ms}"`, SPEED_COLORS[i % SPEED_COLORS.length], game.stepMs === s.ms,
      `<span class="set-ico">${'▸'.repeat(i + 1)}</span><b class="set-name">${s.label}</b>`)
  ).join('');

  const theme = getTheme();
  const modes = THEMES.map((t) =>
    option('theme', `data-mode="${t.mode}"`, t.color, theme === t.mode,
      `<span class="set-ico">${t.icon}</span><b class="set-name">${t.label}</b>`)
  ).join('');

  openDialog(`
    <div class="lv-dlg set-dlg">
      <div class="lv-head">
        <h2>PENGATURAN</h2>
        <p>Atur karakter, kecepatan, dan tampilan</p>
        <button class="lv-close" data-action="close" aria-label="Tutup">✕</button>
      </div>
      <div class="lv-body">
        <section class="set-sec"><h3 class="set-label">KARAKTER</h3><div class="set-chars">${characters}</div></section>
        <section class="set-sec"><h3 class="set-label">KECEPATAN JALAN</h3><div class="set-seg">${speeds}</div></section>
        <section class="set-sec"><h3 class="set-label">MODE TAMPILAN</h3><div class="set-seg">${modes}</div></section>
      </div>
    </div>
  `, {
    character: (d) => { onCharacter(d.id); markSelected('character', 'id', d.id); },
    speed: (d) => { onSpeed(Number(d.ms)); markSelected('speed', 'ms', d.ms); },
    theme: (d) => { setTheme(d.mode); markSelected('theme', 'mode', d.mode); },
    close: closeDialog,
  });
}

/* ---------- Hasil permainan ---------- */

/** result = hasil dari calculateResult(); actions = { restart, next, menu } */
export function showResult(result, { onRestart, onNext, onMenu, hasNext }) {
  const { win, stars, score, extra, mst, used } = result;
  const S = game.state;
  if (game.levelIndex >= 0) saveStars(S.level.name, stars);
  const total = S.g.nodes.length;
  const connected = S.g.nodes.filter((n) => n.vis).length;

  const title = win ? 'MENANG!' : 'KALAH';

  const summary = !win
    ? `Budget tersisa ${S.budget}, padahal minimal butuh ${remainingCost(S.g)} lagi untuk menyambung ${total - connected} node yang tersisa. Pilihan edge sebelumnya terlalu boros, jadi MST tidak mungkin dicapai.`
    : extra <= 0
      ? 'Semua Poké Ball terhubung dengan pohon optimal: bobotnya sama dengan MST!'
      : `Semua Poké Ball terhubung, tetapi pohonmu ${extra} lebih berat dari MST.`;

  // Bintang muncul satu per satu (--i = urutan); yang tidak didapat langsung tampil redup
  const bigStars = [1, 2, 3].map((i) =>
    `<span class="rs-star ${i <= stars ? 'on' : 'off'}" style="--i:${i - 1}">★</span>`).join('');
  const afterMs = (win ? stars : 0) * 450 + 300; // jeda sebelum ringkasan muncul

  openDialog(`
    <div class="lv-dlg rs-dlg ${win ? 'is-win' : 'is-lose'}" style="--after:${afterMs}ms">
      <div class="lv-head">
        <h2>${title}</h2>
        <div class="rs-stars" aria-label="${stars} dari 3 bintang">${bigStars}</div>
      </div>
      <div class="lv-body">
        <div class="rs-after">
          <p class="rs-summary">${summary}</p>
          <div class="rs-nums">
            <div><small>BOBOTMU</small><b>${used}</b></div>
            <div><small>MST</small><b>${mst}</b></div>
            <div><small>SKOR</small><b>${score}</b></div>
          </div>
          <p class="rs-formula">Skor = maks(0, ${SCORE.base} − ${SCORE.perExtraWeight} × selisih bobot − ${SCORE.perHint} × petunjuk (${S.hints}))</p>
          <details class="rs-more">
            <summary>Lihat detail &amp; penjelasan</summary>
            <ul class="rs-list">
              <li>Selisih bobot: <b>${win ? (extra >= 0 ? '+' : '') + extra : '–'}</b></li>
              <li>Node terhubung: <b>${connected} / ${total}</b></li>
              <li>Siklus ditolak: <b>${S.bounces}</b></li>
            </ul>
            <p><b>Pohon rentang:</b> menghubungkan semua V node dengan tepat V−1 = ${total - 1} edge dan <b>tanpa siklus</b>. Edge yang menutup siklus pasti ditolak, itulah yang membuat karakter terpental. MST adalah pohon rentang dengan total bobot minimum.</p>
            <p><b>Strategi:</b> pada tiap langkah, ambil edge termurah yang menyambung pohonmu ke node baru (algoritma Prim).</p>
          </details>
          <div class="row rs-actions">
            <button class="btn" data-action="restart">ULANGI</button>
            ${hasNext ? '<button class="btn" data-action="next">LANJUT</button>' : ''}
            <button class="btn" data-action="menu">MENU</button>
          </div>
        </div>
      </div>
    </div>
  `, { restart: onRestart, next: onNext, menu: onMenu });
}