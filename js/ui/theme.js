/* ===== TEMA TERANG / GELAP =====*/
const KEY = 'pokemon-maze:theme';

export function getTheme() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light'; // localStorage diblokir
  }
}

export function setTheme(theme) {
  const value = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.dataset.theme = value;
  try { localStorage.setItem(KEY, value); } catch { /* abaikan: pilihan tidak tersimpan */ }
}

document.documentElement.dataset.theme = getTheme(); // terapkan saat modul dimuat