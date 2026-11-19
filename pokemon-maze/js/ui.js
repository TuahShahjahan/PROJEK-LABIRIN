/* ===== UI + SCORING ===== */
function ui(){
 const g=S.g,v=g.nodes.filter(n=>n.vis).length,N=g.nodes.length;
 $('sN').textContent=N;$('sV').textContent=v;$('sU').textContent=N-v;$('sM').textContent=S.moves;
 $('sB').textContent=S.budget+' / '+S.budgetMax;$('sW').textContent=S.used;$('sT').textContent=S.k.tot;
 $('sP').textContent=Math.round(v/N*100)+'%';$('bar').style.width=(S.budget/S.budgetMax*100)+'%';distPanel()}
function curIdx(){return S.sv.ix[S.last]}
function visMask(){let m=0;S.g.nodes.forEach((n,i)=>{if(n.vis)m|=1<<i});return m}
function unvisDist(){ // [{id,d}] node belum dikunjungi, urut dari terdekat (jarak terpendek lewat graph)
 const i=curIdx();return S.g.nodes.filter(n=>!n.vis).map(n=>({id:n.id,d:S.sv.d[i][S.sv.ix[n.id]]})).sort((a,b)=>a.d-b.d||a.id.localeCompare(b.id))}
function distPanel(){
 const L=unvisDist();$('dFrom').textContent=S.last;
 $('dl').innerHTML=L.length?L.map((x,k)=>'<span class="'+(k===0?'near':k===L.length-1&&L.length>1?'far':'')+'"><b>'+x.id+'</b> '+x.d+'</span>').join(''):'<span>Semua node sudah dikunjungi</span>';
 $('dnote').textContent=L.length>1?'Terdekat: '+L[0].id+' ('+L[0].d+') · Terjauh: '+L[L.length-1].id+' ('+L[L.length-1].d+')':''}
function giveHint(){
 if(!S||S.over||S.mv)return;
 const i=curIdx(),j=S.sv.next(visMask(),i);if(j<0)return;
 const p=S.sv.path(i,j).map(k=>S.sv.ids[k]);S.hint={to:S.sv.ids[j],path:p};S.hints++;
 $('hmsg').innerHTML='💡 Langkah terbaik dari '+S.last+': menuju <b>'+S.sv.ids[j]+'</b> lewat '+p.join('→')+' (bobot '+S.sv.d[i][j]+'). Sisa biaya minimum semua node: <b>'+S.sv.remaining(visMask(),i)+'</b>. Petunjuk terpakai: '+S.hints+' (−50 skor/petunjuk).'}
function log(t){const l=$('log');l.insertAdjacentHTML('beforeend','<p>'+t+'</p>');l.scrollTop=l.scrollHeight}
function runKruskal(){
 if(S.krRun)return;S.krRun=true;S.g.edges.forEach(e=>{e.st=null;e.cur=false});
 $('log').innerHTML='<p><b>Urutkan edge dari bobot terkecil, lalu cek dengan Union-Find.</b></p>';
 let i=0,phase=0;const{steps}=S.k;
 krTimer=setInterval(()=>{
  if(i>=steps.length){clearInterval(krTimer);S.krRun=false;S.krDone=true;
   log('<b>Selesai: MST = '+S.k.tot+' dengan '+(S.g.nodes.length-1)+' edge.</b>');return}
  const s=steps[i],e=s.e;
  if(phase===0){e.cur=true;log('Cek edge '+e.a+'–'+e.b+' (bobot '+e.w+')…');phase=1}
  else{e.cur=false;e.st=s.ok?'mst':'rej';
   log(s.ok?'✔ Diterima: menghubungkan dua komponen. Total '+s.tot:'✘ Ditolak: akan membentuk cycle');phase=0;i++}},550)}
function instantKruskal(){clearInterval(krTimer);S.krRun=false;S.krDone=true;S.k.steps.forEach(s=>{s.e.st=s.ok?'mst':'rej';s.e.cur=false})}
function finish(win){
 S.over=true;S.mv=null;instantKruskal();$('kr').disabled=true;$('hint').disabled=true;$('hmsg').textContent='';
 const u=S.used,t=S.k.tot,N=S.g.nodes,v=N.filter(n=>n.vis).length,o=S.opt;S.hint=null;
 const stars=!win?0:u<=o?3:u<=o*1.25?2:1,score=win?Math.max(0,1000-25*(u-o)-50*S.hints):0;
 const last=lvIdx>=LEVELS.length-1;TC+=stars;hud();
 $('ovc').innerHTML='<h2 style="color:'+(win?'#2e9b4a':'#d9444d')+'">'+(win?'MENANG! '+'★'.repeat(stars)+'☆'.repeat(3-stars):'KALAH')+'</h2>'+
 '<p>'+(win?'Semua Poké Ball berhasil dikumpulkan!':'Budget habis sebelum semua node dikunjungi.')+'</p>'+
 '<div class="cmp"><div>Bobot MST<b>'+t+'</b></div><div>Biaya perjalananmu<b>'+u+'</b></div>'+
 '<div>Rute optimal<b>'+o+'</b></div><div>Skor<b>'+score+'</b></div>'+
 '<div>Node dikunjungi<b>'+v+' / '+N.length+'</b></div><div>Jumlah move<b>'+S.moves+'</b></div></div>'+
 '<p>Selisih biaya dengan MST: <b>'+(u-t>=0?'+':'')+(u-t)+'</b>. Rute terpendek untuk mengunjungi semua node dari titik awal bernilai <b>'+o+'</b> (garis oranye di peta). Skor = maks(0, 1000 − 25 × langkah ekstra ('+Math.max(0,u-o)+') − 50 × petunjuk ('+S.hints+')).</p>'+
 '<p><b>Hubungan dengan MST:</b> setiap rute yang mengunjungi semua node pasti memakai edge yang menghubungkan semua node, jadi bobot rute ≥ bobot MST. Menelusuri MST pulang-pergi (DFS) tidak lebih dari 2×MST. Maka di level ini: <b>'+t+' ≤ '+o+' ≤ '+(2*t)+'</b>.</p>'+
 '<p><b>Kruskal:</b> urutkan semua edge dari bobot terkecil, ambil edge jika dua ujungnya belum satu komponen (dicek dengan Union-Find), tolak jika membentuk cycle. Berhenti saat terkumpul V−1 = '+(N.length-1)+' edge.</p>'+
 '<p><b>Penting:</b> MST adalah struktur yang menghubungkan semua node dengan total bobot minimum, bukan selalu rute perjalanan terpendek untuk mengunjungi semua node. Pemain harus kembali melewati edge yang sama, sedangkan MST hanya sebuah pohon.</p>'+
 '<div class="row"><button class="btn" id="o1">ULANGI</button>'+(win&&!last?'<button class="btn" id="o2">LEVEL BERIKUT</button>':'')+'<button class="btn" id="o3">LIHAT PETA</button><button class="btn" id="o4">MENU</button></div>';
 $('ov').style.display='flex';
 $('o1').onclick=()=>newGame(lvIdx);if($('o2'))$('o2').onclick=()=>newGame(lvIdx+1);
 $('o3').onclick=()=>$('ov').style.display='none';$('o4').onclick=menu}
function menu(){clearInterval(krTimer);S=null;$('game').style.display='none';$('ov').style.display='none';$('lobby').style.display='flex'}
