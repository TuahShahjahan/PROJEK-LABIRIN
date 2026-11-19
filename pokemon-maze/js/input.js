/* ===== INPUT ===== */
const KM={ArrowUp:'u',ArrowDown:'d',ArrowLeft:'l',ArrowRight:'r',w:'u',s:'d',a:'l',d:'r',W:'u',S:'d',A:'l',D:'r'};
addEventListener('keydown',e=>{const d=KM[e.key];if(!d)return;if(S&&$('game').style.display!=='none')e.preventDefault();if(e.repeat)return;command(d)});
document.querySelectorAll('.pad button').forEach(b=>b.addEventListener('pointerdown',e=>{e.preventDefault();command(b.dataset.d)}));
$('hint').onclick=giveHint;$('dtg').onclick=()=>{S.showDist=!S.showDist;$('dtg').textContent='JARAK: '+(S.showDist?'ON':'OFF')};$('kr').onclick=runKruskal;$('rs').onclick=()=>newGame(lvIdx);$('mn').onclick=menu;
$('how').onclick=()=>{$('ovc').innerHTML='<h2>CARA MAIN</h2><p>Tekan <b>satu kali</b> tombol arah (WASD / panah) dan Snorlax berjalan otomatis sampai node berikutnya. Kunjungi semua Poké Ball (node). Menabrak pohon tidak mengurangi budget.</p><p>Setiap tile yang dilewati memakai 1 budget, sehingga melewati edge berbobot <b>w</b> menghabiskan w budget. Jika budget habis sebelum semua node dikunjungi, kamu kalah.</p><p>Tujuanmu: kunjungi <b>semua</b> node dengan total bobot sekecil mungkin. Angka kecil di bawah tiap Poké Ball adalah <b>jarak terpendek dari posisimu</b> ke node itu (hijau = terdekat, merah = terjauh), jadi kamu tahu node mana yang jauh. Tombol <b>Petunjuk</b> menunjukkan langkah terbaik berikutnya (−50 skor). Setelah selesai, rute optimal ditampilkan.</p><p>Tekan <b>Jalankan Kruskal</b> untuk melihat MST terbentuk: edge hijau masuk MST, edge merah ditolak karena membentuk cycle.</p><div class="row"><button class="btn" id="o5">MENGERTI</button></div>';$('ov').style.display='flex';$('o5').onclick=()=>$('ov').style.display='none'};
let TB=0,TC=0;
function hud(){$('hB').textContent=TB;$('hC').textContent=TC}
function ovShow(t){$('ovc').innerHTML=t;$('ov').style.display='flex'}
$('start').onclick=()=>{ovShow('<h2>PILIH LEVEL</h2><div class="lv">'+LEVELS.map((l,i)=>'<button class="btn" data-i="'+i+'"><span>'+l.name+'</span><span>'+Object.keys(l.n).length+' node</span></button>').join('')+'</div><div class="row"><button class="btn" id="oc">BATAL</button></div>');
 document.querySelectorAll('#ovc .lv .btn').forEach(b=>b.onclick=()=>newGame(+b.dataset.i));$('oc').onclick=()=>$('ov').style.display='none'};
$('set').onclick=()=>{ovShow('<h2>PENGATURAN</h2><p>Kecepatan jalan Snorlax:</p><div class="row">'+[['LAMBAT',190],['NORMAL',130],['CEPAT',80]].map(a=>'<button class="btn" data-s="'+a[1]+'" style="'+(STEP===a[1]?'background:var(--bg)':'')+'">'+a[0]+'</button>').join('')+'</div>');
 document.querySelectorAll('#ovc [data-s]').forEach(b=>b.onclick=()=>{STEP=+b.dataset.s;$('ov').style.display='none'})};
requestAnimationFrame(frame);
