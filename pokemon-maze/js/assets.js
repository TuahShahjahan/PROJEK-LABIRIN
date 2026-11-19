const SP = { "sq": "assets/squirtle.png", "pl": "assets/pikachu-logo.png", "l": "assets/snorlax-left.png", "r": "assets/snorlax-right.png", "d": "assets/snorlax-down.png", "u": "assets/snorlax-up.png", "t": "assets/tree-tile.png" };
/* ===== ASSETS ===== */
const CHARS = { snorlax:  { name: 'SNORLAX',  info: 'Partner Pokémon · Normal type', swap: true },
  pikachu:  { name: 'PIKACHU',  info: 'Partner Pokémon · Electric type' },
  squirtle: { name: 'SQUIRTLE', info: 'Partner Pokémon · Water type' }
};
const IM = {}; for (const k in SP) { IM[k] = new Image(); IM[k].src = SP[k] }
const FN = { l: 'left', r: 'right', u: 'up', d: 'down' }, FLIP = { l: 'r', r: 'l', u: 'u', d: 'd' };
for (const id in CHARS) for (const d in FN) { IM[id + d] = new Image(); IM[id + d].src = 'assets/' + id + '-' + FN[CHARS[id].swap ? FLIP[d] : d] + '.png' }
let CH = 'snorlax';
const G = id => document.getElementById(id); G('logo').src = SP.pl; G('mascot').src = SP.sq; G('pc').src = SP.d;
function pick(id) { CH = id; G('pc').src = IM[id + 'd'].src; const p = document.querySelector('.partner'); p.querySelector('b').textContent = CHARS[id].name; p.querySelector('span').textContent = CHARS[id].info }
pick(CH);