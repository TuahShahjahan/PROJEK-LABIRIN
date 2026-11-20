/* ===== PROGRES LEVEL: bintang terbaik tiap level =====*/
const KEY = 'pokemon-maze:stars';

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY));
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {}; // localStorage kosong / rusak / diblokir
  }
}

export const getStars = (levelName) => load()[levelName] | 0;

export function saveStars(levelName, stars) {
  const value = Math.min(3, stars | 0);
  if (value <= getStars(levelName)) return;
  const data = load();
  data[levelName] = value;
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* abaikan: bintang tidak tersimpan */ }
}