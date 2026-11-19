/* ===== PERHITUNGAN SKOR ===== */
import { SCORE } from '../data/config.js';

/** Hasil akhir satu permainan. */
export function calculateResult(state, win) {
  const mst = state.mst.tot;
  const used = state.used;
  const extra = used - mst; // selisih bobot pohon pemain vs MST

  let stars = 0;
  if (win) {
    if (used <= mst) stars = 3;
    else if (used <= mst * SCORE.twoStarRatio) stars = 2;
    else stars = 1;
  }

  const score = win
    ? Math.max(0, SCORE.base - SCORE.perExtraWeight * extra - SCORE.perHint * state.hints)
    : 0;

  return { win, stars, score, extra, mst, used };
}
