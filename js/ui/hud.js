/* ===== HUD: header, panel samping, dan hamburger menu ===== */
import { candidateCosts } from '../logic/prim.js';
import { game, session } from '../logic/state.js';
import { $ } from './dom.js';

/* ---------- Header (poin Poké Ball & koin) ---------- */

export function updateHeader() {
  $('hB').textContent = session.balls;
  $('hC').textContent = session.coins;
}

/* ---------- Panel samping ---------- */

/** Dipanggil saat level baru dimulai. */
export function resetPanel(level) {
  $('lname').textContent = level.name;
  $('dtg').textContent = 'JARAK: OFF';
  setMessage('');
}

export function setMessage(html) {
  $('hmsg').innerHTML = html;
}

/** Perbarui semua angka di panel dari state sekarang. */
export function updatePanel() {
  const S = game.state;
  if (!S) return;

  const total = S.g.nodes.length;
  const visited = S.g.nodes.filter((n) => n.vis).length;

  $('sN').textContent = total;
  $('sV').textContent = visited;
  $('sU').textContent = total - visited;
  $('sM').textContent = Math.max(0, visited - 1);
  $('sB').textContent = `${S.budget} / ${S.budgetMax}`;
  $('sW').textContent = S.used;
  $('sT').textContent = S.mst.tot;
  $('sP').textContent = S.bounces;
  $('bar').style.width = `${(S.budget / S.budgetMax) * 100}%`;

  $('hint').disabled = S.over;
  $('dtg').textContent = `JARAK: ${S.showDist ? 'ON' : 'OFF'}`;
  $('dFrom').textContent = S.last;
  updateCostList(S);
}

/** Daftar "bobot edge termurah dari pohonmu ke tiap node yang belum terhubung". */
function updateCostList(S) {
  const costs = candidateCosts(S.g);
  const list = Object.entries(costs)
    .map(([id, cost]) => ({ id, cost }))
    .sort((a, b) => (a.cost == null) - (b.cost == null) || a.cost - b.cost || a.id.localeCompare(b.id));

  const min = list.length && list[0].cost != null ? list[0].cost : null;

  $('dl').innerHTML = list.length
    ? list.map((x) => {
        const near = S.showDist && x.cost != null && x.cost === min;
        return `<span class="${near ? 'near' : ''}"><b>${x.id}</b> ${x.cost == null ? '–' : x.cost}</span>`;
      }).join('')
    : '<span>Semua node sudah terhubung</span>';

  $('dnote').textContent = min != null
    ? `Termurah sekarang: ${list.filter((x) => x.cost === min).map((x) => x.id).join(', ')} (bobot ${min}). “–” = belum ada edge dari pohonmu ke node itu.`
    : '';
}

/* ---------- Hamburger menu (☰) ---------- */

export function closeMenu() {
  $('menuList').classList.remove('open');
  $('menuBtn').setAttribute('aria-expanded', 'false');
}

function toggleMenu() {
  const open = $('menuList').classList.toggle('open');
  $('menuBtn').setAttribute('aria-expanded', String(open));
}

/** Pasang event hamburger. `actions` = { restart, menu } */
export function initHamburger(actions) {
  $('menuBtn').addEventListener('click', toggleMenu);

  $('menuList').addEventListener('click', (e) => {
    const item = e.target.closest('[data-action]');
    if (!item) return;
    closeMenu();
    actions[item.dataset.action]?.();
  });

  // Klik di luar menu / tekan Escape = tutup
  document.addEventListener('pointerdown', (e) => {
    if (!$('menuWrap').contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}
