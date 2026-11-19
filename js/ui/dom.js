/* ===== AKSES DOM ===== */

export const $ = (id) => document.getElementById(id);

/** Pindah layar. 'lobby' = menu utama, 'game' = sedang bermain. */
export function showScreen(name) {
  document.body.classList.toggle('in-game', name === 'game');
}
