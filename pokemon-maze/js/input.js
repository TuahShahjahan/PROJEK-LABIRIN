/* ===== INPUT ===== */
const KM = { ArrowUp: 'u', ArrowDown: 'd', ArrowLeft: 'l', ArrowRight: 'r', w: 'u', s: 'd', a: 'l', d: 'r', W: 'u', S: 'd', A: 'l', D: 'r' };
addEventListener('keydown', e => { const d = KM[e.key]; if (!d) return; if (S && $('game').style.display !== 'none') e.preventDefault(); if (e.repeat) return; command(d) });
document.querySelectorAll('.pad button').forEach(b => b.addEventListener('pointerdown', e => { e.preventDefault(); command(b.dataset.d) }));
$('hint').onclick = giveHint; $('kr').onclick = runKruskal; $('rs').onclick = () => newGame(lvIdx, lvIdx < 0 ? S.c : null);
cv.addEventListener('pointerdown', e => {
    if (!S || S.over) return; const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) * cv.width / r.width, y = (e.clientY - r.top) * cv.height / r.height;
    const n = S.g.nodes.find(n => Math.hypot(n.x * TS + TS / 2 - x, n.y * TS + TS / 2 - y) < TS * .6); if (n) travelTo(n.id)
}); 
// klik node terhubung = jalan otomatis (gratis)
$('mn').onclick=menu;
$('how').onclick = () => { $('ovc').innerHTML = '<h2>CARA MAIN</h2><p>Kamu membangun <b>Minimum Spanning Tree</b>. Tekan satu kali tombol arah (WASD / panah), Snorlax berjalan otomatis sampai node berikutnya. Sambungkan <b>semua</b> Poké Ball (node) dengan total bobot sekecil mungkin.</p><p><b>Aturan:</b></p><p>① Edge baru yang menyambung node baru dibayar sekali: <b>w</b> budget (1 per tile).<br>② Lewat edge yang sudah kamu ambil itu <b>gratis</b>, jadi mundur ke cabang lain tidak memakan budget.<br>③ Edge yang menyambung dua node yang sudah ada di tree-mu akan membentuk <b>cycle</b>: kamu <b>terpental</b> dan tidak bisa lewat. Tree tidak boleh punya cycle.</p><p>Hati-hati: kalau kamu menyambung sebuah node lewat edge mahal, edge murahnya nanti ditolak karena cycle. Pilih edge termurah dulu! Skor makin tinggi jika bobot tree-mu makin dekat dengan MST. Tombol <b>Petunjuk</b> memberi edge terbaik berikutnya (−50 skor). Klik node yang sudah terhubung untuk berjalan ke sana otomatis (gratis). Tombol <b>Jalankan Kruskal</b> memperlihatkan MST.</p><div class=\"row\"><button class=\"btn\" id=\"o5\">MENGERTI</button></div>'; $('ov').style.display = 'flex'; $('o5').onclick = () => $('ov').style.display = 'none' };
let TB = 0, TC = 0;
function hud() { $('hB').textContent = TB; $('hC').textContent = TC }
function ovShow(t) { $('ovc').innerHTML = t; $('ov').style.display = 'flex' }
$('start').onclick = () => {
    ovShow('<h2>PILIH LEVEL</h2><div class="lv">' + LEVELS.map((l, i) => '<button class="btn" data-i="' + i + '"><span>' + l.name + '</span><span>' + Object.keys(l.n).length + ' node</span></button>').join('') + '<button class="btn" data-i="-1"><span>LEVEL ACAK</span><span>baru tiap main</span></button></div><div class="row"><button class="btn" id="oc">BATAL</button></div>');
    document.querySelectorAll('#ovc .lv .btn').forEach(b => b.onclick = () => +b.dataset.i < 0 ? newGame(-1, randomLevel()) : newGame(+b.dataset.i)); $('oc').onclick = () => $('ov').style.display = 'none'
};
$('set').onclick = () => {
    ovShow('<h2>PENGATURAN</h2><p>Karakter:</p><div class="row">' + Object.keys(CHARS).map(id => '<button class="btn" data-c="' + id + '" style="' + (CH === id ? 'background:var(--bg)' : '') + '">' + CHARS[id].name + '</button>').join('') + '</div><p>Kecepatan jalan:</p><div class="row">' + [['LAMBAT', 190], ['NORMAL', 130], ['CEPAT', 80]].map(a => '<button class="btn" data-s="' + a[1] + '" style="' + (STEP === a[1] ? 'background:var(--bg)' : '') + '">' + a[0] + '</button>').join('') + '</div>');
    document.querySelectorAll('#ovc [data-c]').forEach(b => b.onclick = () => { pick(b.dataset.c); $('ov').style.display = 'none' });
    document.querySelectorAll('#ovc [data-s]').forEach(b => b.onclick = () => { STEP = +b.dataset.s; $('ov').style.display = 'none' })
};
requestAnimationFrame(frame);
