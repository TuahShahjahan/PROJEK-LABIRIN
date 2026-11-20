/* ===== AKSES DOM ===== */

export const $ = (id) => document.getElementById(id);

/** Pindah layar: 'lobby' = menu utama, 'game' = bermain, 'howto' = cara main. */
export function showScreen(name) {
  document.body.classList.toggle('in-game', name === 'game');
  document.body.classList.toggle('in-howto', name === 'howto');
  window.scrollTo(0, 0);
}
