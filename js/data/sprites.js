/* ===== SPRITE & KARAKTER =====
   Struktur aset:
     assets/characters/<nama>/{up,down,left,right}.png
     assets/ui/{pikachu-logo,squirtle,tree-tile}.png
   (logo & maskot dipasang langsung di index.html) */

export const CHARACTERS = {
  snorlax: { name: 'SNORLAX', info: 'Partner Pokémon · Normal type' },
  pikachu: { name: 'PIKACHU', info: 'Partner Pokémon · Electric type' },
  squirtle: { name: 'SQUIRTLE', info: 'Partner Pokémon · Water type' },
};
export const DEFAULT_CHARACTER = 'snorlax';

const FACINGS = ['up', 'down', 'left', 'right'];
const FACING_OF = { u: 'up', d: 'down', l: 'left', r: 'right' };


const loadImage = (src) => {
  const img = new Image();
  img.src = src;
  return img;
};

// Semua gambar dimuat sekali di awal
const treeImage = loadImage('assets/ui/tree-tile.png'); // tile pohon (tembok)

const characterImages = {};
for (const id in CHARACTERS) {
  characterImages[id] = {};
  for (const facing of FACINGS) {
    characterImages[id][facing] = loadImage(`assets/characters/${id}/${facing}.png`);
  }
}

export const getTreeImage = () => treeImage;

/** Gambar karakter. `dir` = 'u' | 'd' | 'l' | 'r' */
export const getCharacterImage = (id, dir) => characterImages[id][FACING_OF[dir]];
