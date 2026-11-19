/* ===== GAME STATE ===== */
let STEP=130;const TS=36,DIR={u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]};
let S=null,held=[],lvIdx=0,krTimer=null;
const $=id=>document.getElementById(id),cv=$('cv'),cx=cv.getContext('2d');
function newGame(i){
 lvIdx=i;const c=LEVELS[i],g=buildGraph(c),a=g.by[c.start||g.nodes[0].id];a.vis=true;
 const k=kruskal(g.nodes,g.edges),sv=buildSolver(g),si=sv.ix[a.id],opt=sv.remaining(1<<si,si),ro=sv.route(si);clearInterval(krTimer);
 S={c,g,k,sv,opt,ro,budgetMax:c.budget||Math.ceil(opt*1.4),hints:0,hint:null,showDist:true,px:a.x,py:a.y,dir:'d',mv:null,budget:c.budget||Math.ceil(opt*1.4),used:0,moves:0,last:a.id,over:false,fx:[],trail:[],auto:null,pend:null,krRun:false,krDone:false};
 cv.width=g.W*TS;cv.height=g.H*TS;$('lname').textContent=c.name;
 $('log').innerHTML='<p>Tekan tombol untuk melihat Kruskal memilih edge dari bobot terkecil.</p>';
 $('hmsg').textContent='';$('kr').disabled=false;$('hint').disabled=false;$('lobby').style.display='none';$('game').style.display='flex';$('ov').style.display='none';ui()}
