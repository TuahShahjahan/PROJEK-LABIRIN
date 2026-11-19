/* ===== PLAYER MOVEMENT + COLLISION ===== */
function tryMove(d,ts){
 S.dir=d;const[dx,dy]=DIR[d],nx=S.px+dx,ny=S.py+dy;
 if(!S.g.grid[ny]||!S.g.grid[ny][nx]||S.budget<=0){S.auto=null;return} // tembok tidak bisa ditembus
 S.mv={fx:S.px,fy:S.py,tx:nx,ty:ny,t0:ts}}
function command(d){ // satu tekanan = jalan otomatis sampai node berikutnya
 if(!S||S.over)return;const[dx,dy]=DIR[d],bx=S.mv?S.mv.tx:S.px,by=S.mv?S.mv.ty:S.py;
 if(!(S.g.grid[by+dy]&&S.g.grid[by+dy][bx+dx]))return;
 if(S.mv)S.pend=d;else S.auto=d}
function arrive(){
 const m=S.mv;S.px=m.tx;S.py=m.ty;S.mv=null;S.used++;S.budget--;S.trail.push([m.fx,m.fy,m.tx,m.ty]);
 const n=S.g.nodes.find(n=>n.x===S.px&&n.y===S.py);
 if(n){S.hint=null;$('hmsg').textContent='';if(n.id!==S.last){S.moves++;S.last=n.id}
  if(!n.vis){n.vis=true;S.fx.push({x:n.x,y:n.y,t0:performance.now()});TB++}}
 S.auto=n?S.pend:(S.pend||S.auto);S.pend=null;hud();ui();
 if(S.g.nodes.every(n=>n.vis))finish(true);else if(S.budget<=0)finish(false)}
