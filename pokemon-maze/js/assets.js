const SP={"sq": "assets/squirtle.png", "pl": "assets/pikachu-logo.png", "l": "assets/snorlax-left.png", "r": "assets/snorlax-right.png", "d": "assets/snorlax-down.png", "u": "assets/snorlax-up.png", "t": "assets/tree-tile.png"};
/* ===== ASSETS ===== */
const IM={};for(const k in SP){IM[k]=new Image();IM[k].src=SP[k]}
const G=id=>document.getElementById(id);G('logo').src=SP.pl;G('mascot').src=SP.sq;G('pc').src=SP.d;
