/* СПЕКТР fx.js - живой фон для 4 стилей (Неон, Космос, Акварель, Пиксель) и "живые" кнопки.
   Один холст на всю страницу, позади контента. Фон движется при прокрутке, реагирует на палец/мышь.
   Подключение: <script src="fx.js" defer></script>. Отключить: убрать строку подключения. */
(function(){
'use strict';
var D=document,R=D.documentElement;
var RED=matchMedia('(prefers-reduced-motion: reduce)').matches;
var FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
var LITE=!FINE||matchMedia('(max-width:860px)').matches;
var TAU=Math.PI*2, _sd=20261017;function rnd(){_sd=(_sd+0x6D2B79F5)|0;var t=Math.imul(_sd^(_sd>>>15),1|_sd);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}
/* на страницах кружков (Взлёт, студия) своего переключателя стилей нет: берём стиль, выбранный на портале */
var SKINS=[['neon','Неон'],['space','Космос'],['aqua','Акварель'],['pixel','Пиксель']];
if(!window.SKIN){(function(){var K='spectr_skin',cur=null,subs=[];try{cur=localStorage.getItem(K)}catch(e){}if(!SKINS.some(function(x){return x[0]===cur}))cur='space';R.dataset.skin=cur;
  window.SKIN={get:function(){return cur},on:function(f){subs.push(f)},set:function(k){cur=k;R.dataset.skin=k;try{localStorage.setItem(K,k)}catch(e){}subs.forEach(function(f){try{f(k)}catch(e){}})}}})()}
function skin(){return (window.SKIN&&SKIN.get())||R.dataset.skin||'neon'}
function dark(){return R.dataset.theme!=='light'}

/* ---------- холст ---------- */
var cv=D.createElement('canvas');cv.id='bgfx';cv.setAttribute('aria-hidden','true');cv.style.cssText='position:fixed;left:0;top:0;width:100vw;height:100vh;z-index:-1;pointer-events:none';
var cx=cv.getContext('2d',{alpha:true});if(!cx)return;
R.classList.add('fx');
function mount(){D.body.insertBefore(cv,D.body.firstChild)}
if(D.body)mount();else D.addEventListener('DOMContentLoaded',mount);

var W=0,H=0,DPR=1,hero=null,heroH=0,Q=1; // Q - качество, снижается само, если компьютер не успевает
function size(keep){var d=LITE?.75*Q:Math.min(window.devicePixelRatio||1,1.5,Math.sqrt(1.4e6/(innerWidth*innerHeight)))*Q;d=Math.max(.5,d);DPR=skin()==='pixel'?(LITE?.5:1):d;cv.style.imageRendering=skin()==='pixel'?'pixelated':'auto';W=innerWidth;H=innerHeight;
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);cx.setTransform(DPR,0,0,DPR,0,0);
  hero=D.querySelector('.hero');heroH=hero?hero.offsetTop+hero.offsetHeight:0;var l=D.getElementById('lw');if(l){var r=l.getBoundingClientRect();LW={x:r.left+r.width/2,y:r.top+scrollY+r.height/2,r:r.width/2}}if(!keep||skin()==='pixel')S={};}
var LW=null;
var lastW=0;addEventListener('resize',function(){if(LITE&&Math.abs(innerWidth-lastW)<2&&Math.abs(innerHeight-H)<160)return;lastW=innerWidth;size()});

/* ---------- ввод: прокрутка и палец ---------- */
var sy=scrollY,psy=sy,vel=0,mx=.5,my=.5,tmx=.5,tmy=.5,boost=0;
addEventListener('pointermove',function(e){tmx=e.clientX/W;tmy=e.clientY/H},{passive:true});
addEventListener('pointerdown',function(e){tmx=e.clientX/W;tmy=e.clientY/H;boost=1},{passive:true});

/* ---------- общие помощники ---------- */
var S={}; // состояние сцены, сбрасывается при смене стиля и размера
function pre(w,h,f){var c=D.createElement('canvas');c.width=w;c.height=h;f(c.getContext('2d'),w,h);return c}
function gauss(){return (rnd()+rnd()+rnd()-1.5)/1.5}
function hexA(h,a){var n=parseInt(h.slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'}
// тёмная "полоса" под первым экраном в светлой теме (чтобы белый текст первого экрана читался)
function band(){if(dark())return 0;var k=skin();if(k==='aqua')return 0;return Math.max(0,heroH-scrollY)}

/* =====================================================================
   КОСМОС: галактика, туманности, звёзды летят навстречу (быстрее при прокрутке)
   ===================================================================== */
function galaxy(sz,arms,pal,n){return pre(sz,sz,function(g,w){var c=w/2,Rr=w*.46,k=w/360;
  // мягкое гало и яркое ядро
  var hg=g.createRadialGradient(c,c,0,c,c,Rr);hg.addColorStop(0,'rgba(255,225,190,.30)');hg.addColorStop(.35,'rgba(150,130,240,.10)');hg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=hg;g.fillRect(0,0,w,w);
  g.globalCompositeOperation='lighter';
  // звёзды рукавов: узкие рукава, к краю мельче
  for(var i=0;i<n;i++){var arm=i%arms,r=Math.pow(rnd(),.6),a=arm*TAU/arms+r*5.2+gauss()*.26*(1-r*.5),rr=r*Rr,
    x=c+Math.cos(a)*rr+gauss()*3*k,y=c+Math.sin(a)*rr+gauss()*3*k,col=pal[Math.min(pal.length-1,(r*pal.length)|0)],s=(rnd()<.03?2.4:rnd()*1.0+.35)*Math.max(.8,k*.9);
    g.globalAlpha=(1-r*.6)*(.3+rnd()*.6);g.fillStyle=col;g.fillRect(x,y,s,s)}
  // балдж: плотное жёлтое облако звёзд у ядра
  for(i=0;i<n/5;i++){var rb=Math.abs(gauss())*Rr*.22,ab=rnd()*TAU;g.globalAlpha=.25+rnd()*.5;g.fillStyle=rnd()<.6?'#fde7c2':'#ffffff';g.fillRect(c+Math.cos(ab)*rb,c+Math.sin(ab)*rb,Math.max(.8,k*.9),Math.max(.8,k*.9))}
  // розовые области звездообразования вдоль рукавов
  for(i=0;i<(n/300|0)+4;i++){r=.25+rnd()*.7;a=(i%arms)*TAU/arms+r*5.2+gauss()*.15;x=c+Math.cos(a)*r*Rr;y=c+Math.sin(a)*r*Rr;var pg=g.createRadialGradient(x,y,0,x,y,(5+rnd()*9)*k);
    pg.addColorStop(0,'rgba(255,120,200,.35)');pg.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=1;g.fillStyle=pg;g.fillRect(x-20*k,y-20*k,40*k,40*k)}
  // пылевые полосы: тёмные пятна на внутренней кромке рукавов
  g.globalCompositeOperation='source-over';
  for(i=0;i<(n/45|0)+6;i++){r=.18+rnd()*.6;a=(i%arms)*TAU/arms+r*5.2-.16+gauss()*.08;x=c+Math.cos(a)*r*Rr;y=c+Math.sin(a)*r*Rr;var dg=g.createRadialGradient(x,y,0,x,y,(6+rnd()*12)*k);
    dg.addColorStop(0,'rgba(6,4,18,.42)');dg.addColorStop(1,'rgba(6,4,18,0)');g.globalAlpha=1;g.fillStyle=dg;g.fillRect(x-24*k,y-24*k,48*k,48*k)}
  // ядро
  g.globalCompositeOperation='lighter';var cg=g.createRadialGradient(c,c,0,c,c,Rr*.2);cg.addColorStop(0,'rgba(255,248,230,1)');cg.addColorStop(.25,'rgba(255,214,160,.7)');cg.addColorStop(1,'rgba(0,0,0,0)');g.globalAlpha=1;g.fillStyle=cg;g.fillRect(0,0,w,w);
})}
function nebula(sz,cols){return pre(sz,sz,function(g,w){for(var i=0;i<14;i++){var x=w*(.2+rnd()*.6),y=w*(.2+rnd()*.6),r=w*(.12+rnd()*.25),rg=g.createRadialGradient(x,y,0,x,y,r);
  rg.addColorStop(0,hexA(cols[i%cols.length],.16));rg.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=rg;g.fillRect(0,0,w,w)}})}
function spaceInit(){var n=LITE?150:640;S.st=[];for(var i=0;i<n;i++)S.st.push({x:(rnd()*2-1),y:(rnd()*2-1),z:rnd()+.02,c:rnd()<.12?'#c7d2fe':rnd()<.08?'#fde68a':'#ffffff'});
  var gs=LITE?640:1200;S.g1=galaxy(gs,2,['#fff7ed','#fde68a','#c4b5fd','#93c5fd','#67e8f9','#f0abfc'],LITE?9000:30000);
  S.g2=galaxy(LITE?220:420,3,['#fef3c7','#fbcfe8','#a5b4fc','#99f6e4'],LITE?1800:3600);
  S.nb=nebula(LITE?256:640,['#7c3aed','#2563eb','#db2777','#0891b2']);S.ga=0;S.shoot=null;S.far=[];
  for(i=0;i<(LITE?50:260);i++)S.far.push({x:rnd(),y:rnd()*3,s:rnd()*1.2+.3,p:rnd()*TAU})}
function space(t,dt,y0,y1,dk){if(!S.st)spaceInit();var sc=scrollY,cxp=W*(.5+(mx-.5)*.12),cyp=H*(.45+(my-.5)*.12),f=Math.max(W,H)*.55;
  cx.save();cx.beginPath();cx.rect(0,y0,W,y1-y0);cx.clip();
  if(dk){var bg=cx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#03050f');bg.addColorStop(1,'#0a0f2e');cx.fillStyle=bg;cx.fillRect(0,y0,W,y1-y0)}
  cx.globalCompositeOperation=dk&&!LITE?'lighter':'source-over';
  // дальние неподвижные звёзды (медленный параллакс)
  for(var i=0;i<S.far.length;i++){var s=S.far[i],yy=((s.y*H-sc*.05)%(H*3)+H*3)%(H*3);if(yy>H)continue;cx.globalAlpha=(dk?.35:.25)+.35*Math.sin(t*.0015+s.p);cx.fillStyle=dk?'#fff':'#4338ca';cx.fillRect(s.x*W,yy,s.s,s.s)}
  // туманность и галактики
  cx.globalAlpha=dk?.9:.32;var nbs=Math.max(W,H)*1.3;cx.drawImage(S.nb,W*.5-nbs/2+(mx-.5)*-30,H*.5-nbs/2-((sc*.04)%H)+(my-.5)*-30,nbs,nbs);
  S.ga+=dt*(.000035+Math.min(.0006,Math.abs(vel)*.0000006));
  var gsz=Math.min(1100,Math.max(W,H)*(LITE?1.05:.95)),gx=W*(W<700?.62:.68)+(mx-.5)*-40,gy=H*.36-Math.min(sc*.12,H*.25)+(my-.5)*-30;
  cx.globalAlpha=dk?1:.5;cx.save();cx.translate(gx,gy);cx.rotate(-.42);cx.scale(1,.42);cx.rotate(S.ga);cx.drawImage(S.g1,-gsz/2,-gsz/2,gsz,gsz);cx.restore();
  var g2=gsz*.22;cx.globalAlpha=dk?.85:.4;cx.save();cx.translate(W*.16+(mx-.5)*-20,H*.78-Math.min(sc*.07,H*.2));cx.rotate(.5);cx.scale(1,.55);cx.rotate(-S.ga*1.6);cx.drawImage(S.g2,-g2/2,-g2/2,g2,g2);cx.restore();
  // звёзды летят навстречу: прокрутка вниз - летим вперёд, вверх - назад
  var sp=.00009+vel*.0000011+boost*.0006;sp=Math.max(-.004,Math.min(.006,sp));var streak=Math.abs(sp)>.0006;
  cx.lineCap='round';
  for(i=0;i<S.st.length;i++){s=S.st[i];var pz=s.z;s.z-=sp*dt;if(s.z<=.02){s.z+=1;s.x=rnd()*2-1;s.y=rnd()*2-1;pz=s.z}if(s.z>1.02){s.z-=1;s.x=rnd()*2-1;s.y=rnd()*2-1;pz=s.z}
    var x=cxp+s.x/s.z*f,y=cyp+s.y/s.z*f;if(x<-20||x>W+20||y<-20||y>H+20)continue;var a=Math.min(1,(1-s.z)*1.4),r=(1-s.z)*2.3+.3;
    cx.globalAlpha=a*(dk?1:.7);if(streak){var x2=cxp+s.x/pz*f,y2=cyp+s.y/pz*f;cx.strokeStyle=dk?s.c:'#4338ca';cx.lineWidth=r;cx.beginPath();cx.moveTo(x2,y2);cx.lineTo(x,y);cx.stroke()}
    else{cx.fillStyle=dk?s.c:'#4338ca';if(LITE){var q=r*1.1;cx.fillRect(x-q/2,y-q/2,q,q)}else{cx.beginPath();cx.arc(x,y,r*.6,0,TAU);cx.fill()}}}
  // падающая звезда
  if(!S.shoot&&rnd()<dt*.00025)S.shoot={x:rnd()*W*.7,y:rnd()*H*.4,l:0,v:.9+rnd()*.6};
  if(S.shoot){var o=S.shoot;o.l+=dt*o.v;var ex=o.x+o.l,ey=o.y+o.l*.42,gr=cx.createLinearGradient(ex-170,ey-72,ex,ey);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,dk?'#fff':'#4338ca');
    cx.globalAlpha=1;cx.strokeStyle=gr;cx.lineWidth=2;cx.beginPath();cx.moveTo(ex-170,ey-72);cx.lineTo(ex,ey);cx.stroke();if(o.l>W*.8)S.shoot=null}
  cx.restore();cx.globalAlpha=1;cx.globalCompositeOperation='source-over'}

/* =====================================================================
   НЕОН: ретро-солнце, 3D-сетка до горизонта (мчимся вперёд при прокрутке), радужные волны, искры
   ===================================================================== */
var NC=['#f43f5e','#fb923c','#facc15','#22c55e','#06b6d4','#6366f1','#a855f7'];
function neonInit(){S.z=0;S.sp=[];for(var i=0;i<(LITE?24:90);i++)S.sp.push({x:rnd()*2-1,y:rnd()*2-1,z:rnd(),c:NC[(rnd()*7)|0]})}
function neon(t,dt,y0,y1,dk){if(!S.sp)neonInit();var sc=scrollY,prog=Math.min(1,sc/Math.max(1,D.documentElement.scrollHeight-H));
  cx.save();cx.beginPath();cx.rect(0,y0,W,y1-y0);cx.clip();
  var ph=W<760,hz=H*((ph?.66:.6)+(my-.5)*.04)-Math.min(sc*.06,H*.12),cxp=W*(.5+(mx-.5)*.06);
  if(dk){var bg=cx.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0b0914');bg.addColorStop(.55,'#1d0b45');bg.addColorStop(1,'#0b0914');cx.fillStyle=bg;cx.fillRect(0,y0,W,y1-y0)}
  // солнце
  var sr=LW?LW.r*1.32:Math.min(W,H)*.2,sx=LW?LW.x+(mx-.5)*-14:cxp,syy=LW?LW.y-sc*.55+(my-.5)*-10:hz-sr*.35,sg=cx.createLinearGradient(0,syy-sr,0,syy+sr);sg.addColorStop(0,'#facc15');sg.addColorStop(.5,'#fb7185');sg.addColorStop(1,'#a855f7');
  if(syy>-sr*2.5){cx.globalAlpha=dk?.95:.45;cx.fillStyle=sg;cx.beginPath();cx.arc(sx,syy,sr,0,TAU);cx.fill();
  cx.globalCompositeOperation='destination-out';for(var k=0;k<7;k++){var by=syy+sr*(.05+k*.13),bh=2+k*1.6;cx.fillRect(sx-sr,by,sr*2,bh)}cx.globalCompositeOperation='source-over';
  var glow=cx.createRadialGradient(sx,syy,sr*.6,sx,syy,sr*2.2);glow.addColorStop(0,dk?'rgba(251,113,133,.35)':'rgba(251,113,133,.15)');glow.addColorStop(1,'rgba(251,113,133,0)');cx.globalAlpha=1;cx.fillStyle=glow;cx.fillRect(sx-sr*2.2,syy-sr*2.2,sr*4.4,sr*4.4);}
  // пол под горизонтом
  if(dk){var fl=cx.createLinearGradient(0,hz,0,H);fl.addColorStop(0,'#14062e');fl.addColorStop(1,'#05030b');cx.fillStyle=fl;cx.fillRect(0,hz,W,H-hz)}
  else{cx.fillStyle='rgba(124,58,237,.05)';cx.fillRect(0,hz,W,H-hz)}
  // сетка: мчимся вперёд (быстрее при прокрутке вниз, назад при прокрутке вверх)
  S.z+=dt*(.00028+vel*.0000035+boost*.002);var zf=((S.z%1)+1)%1,hue=Math.round(prog*200);
  cx.strokeStyle='hsl('+(300-hue)+',95%,'+(dk?62:55)+'%)';cx.lineWidth=dk?1.6:1.2;var glw=dk&&!LITE;
  var gh=H-hz,cam=gh*.9;
  var ga=(ph&&sc<H)?.55:1;for(var i=1;i<26;i++){var z=i-zf;if(z<=0.05)continue;var y=hz+cam/z;if(y>H)continue;cx.globalAlpha=Math.min(1,1.6/z)*(dk?.9:.5)*ga;cx.beginPath();cx.moveTo(0,y);cx.lineTo(W,y);if(glw){var a0=cx.globalAlpha;cx.lineWidth=6;cx.globalAlpha=a0*.18;cx.stroke();cx.lineWidth=1.6;cx.globalAlpha=a0}cx.stroke()}
  cx.globalAlpha=(dk?.75:.4)*ga;cx.beginPath();for(i=-14;i<=14;i++){var bx=cxp+i*W*.16;cx.moveTo(cxp+i*W*.008,hz);cx.lineTo(bx+(bx-cxp)*2.2,H+gh*1.2)}if(glw){cx.lineWidth=6;cx.globalAlpha*=.18;cx.stroke();cx.lineWidth=1.6;cx.globalAlpha=(dk?.75:.4)*ga}cx.stroke()
  // радужные волны над горизонтом
  cx.globalCompositeOperation=dk&&!LITE?'lighter':'source-over';
  for(k=0;k<7;k++){cx.beginPath();var amp=H*.035+k*3+(mx-.5)*30,ph=t*(.0006+k*.00006)+k*.7+sc*.002,base=hz-H*.32+(k-3)*11-Math.min(sc*.1,H*.15);
    for(var x=0;x<=W;x+=LITE?24:9){var yy=base+Math.sin(x*.005+ph*3)*amp+Math.sin(x*.012+ph*5+k)*amp*.45;x?cx.lineTo(x,yy):cx.moveTo(x,yy)}
    cx.strokeStyle=NC[k];cx.globalAlpha=dk?.45:.3;cx.lineWidth=LITE?3:4;cx.stroke()}
  // искры летят навстречу
  var spd=.00012+vel*.0000012+boost*.0008;
  for(i=0;i<S.sp.length;i++){var s=S.sp[i];s.z-=spd*dt;if(s.z<=.03){s.z+=1;s.x=rnd()*2-1;s.y=rnd()*2-1}if(s.z>1)s.z-=1;
    var px=cxp+s.x/s.z*W*.4,py=hz*.7+s.y/s.z*H*.4;if(px<0||px>W||py<0||py>H)continue;cx.globalAlpha=(1-s.z)*(dk?.9:.6);cx.fillStyle=s.c;var pr=(1-s.z)*3+.4;if(LITE)cx.fillRect(px-pr,py-pr,pr*2,pr*2);else{cx.beginPath();cx.arc(px,py,pr,0,TAU);cx.fill()}}
  cx.restore();cx.globalAlpha=1;cx.globalCompositeOperation='source-over'}

/* =====================================================================
   АКВАРЕЛЬ: бумага, слои пятен краски на разной глубине (параллакс), капли и пузырьки
   ===================================================================== */
var AC=['#f9a8b8','#fdba8c','#fcd97d','#9be3b0','#8dd8ee','#a9b4fb','#e6a8f5'];
// на тёмном фоне краски сочнее (просьба владельца 17.10: Акварель была слишком тусклой)
var ACD=['#ff4f9a','#ff8a3d','#ffd23f','#2fe08a','#29c6f5','#6f7dff','#d35cff'];
function blob(col){return pre(320,320,function(g,w){var c=w/2;for(var i=0;i<26;i++){var a=rnd()*TAU,d=rnd()*w*.16,x=c+Math.cos(a)*d,y=c+Math.sin(a)*d,r=w*(.16+rnd()*.17),rg=g.createRadialGradient(x,y,r*.2,x,y,r);
  rg.addColorStop(0,hexA(col,.10));rg.addColorStop(.82,hexA(col,.13));rg.addColorStop(.92,hexA(col,.22));rg.addColorStop(1,hexA(col,0));g.fillStyle=rg;g.beginPath();g.arc(x,y,r,0,TAU);g.fill()}})}
function aquaInit(){S.bl=[];S.bdk=dark();var PAL=S.bdk?ACD:AC;for(var i=0;i<(LITE?7:16);i++){var d=[.15,.35,.7][i%3];S.bl.push({img:blob(PAL[i%7]),x:rnd(),y:rnd()*3,d:d,s:(.35+rnd()*.45)*(.6+d),p:rnd()*TAU})}
  S.paper=pre(160,160,function(g,w){var im=g.createImageData(w,w);for(var i=0;i<im.data.length;i+=4){var v=200+rnd()*55|0;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=rnd()*22|0}g.putImageData(im,0,0)});
  S.pat=cx.createPattern(S.paper,'repeat');S.dr=[];for(i=0;i<(LITE?8:30);i++)S.dr.push({x:rnd(),y:rnd(),z:.3+rnd()*.7,c:PAL[(rnd()*7)|0],p:rnd()*TAU,b:rnd()<.4})}
function aqua(t,dt,y0,y1,dk){if(!S.bl||S.bdk!==dark())aquaInit();var sc=scrollY,M=Math.max(W,H);
  cx.save();cx.beginPath();cx.rect(0,y0,W,y1-y0);cx.clip();
  if(!LITE)cx.globalCompositeOperation=dk?'screen':'multiply';
  for(var i=0;i<S.bl.length;i++){var b=S.bl[i],span=H*3,yy=((b.y*H-sc*b.d)%span+span)%span-H*.6,x=(b.x+Math.sin(t*.00007+b.p)*.05)*W+(mx-.5)*-80*b.d,sz=M*b.s*(1+Math.sin(t*.0004+b.p)*.05);
    if(yy<-sz||yy>H+sz)continue;cx.globalAlpha=dk?(LITE?.46:.5):(LITE?.6:.9);cx.drawImage(b.img,x-sz/2,yy-sz/2+(my-.5)*-60*b.d,sz,sz)}
  cx.globalCompositeOperation='source-over';
  // капли краски и мыльные пузырьки поднимаются
  for(i=0;i<S.dr.length;i++){var d=S.dr[i];d.y-=dt*.00003*d.z*(1+Math.abs(vel)*.002);if(d.y<-.1){d.y=1.1;d.x=rnd()}
    var px=(d.x+Math.sin(t*.0008+d.p)*.02)*W,py=((d.y*H-sc*d.z*.3)%H+H)%H,r=(d.b?10:4)*d.z+2;
    if(d.b){cx.globalAlpha=dk?.35:.5;cx.strokeStyle=d.c;cx.lineWidth=1.4;cx.beginPath();cx.arc(px,py,r,0,TAU);cx.stroke();cx.globalAlpha=dk?.5:.7;cx.fillStyle='#fff';cx.beginPath();cx.arc(px-r*.35,py-r*.35,r*.2,0,TAU);cx.fill()}
    else{cx.globalAlpha=dk?.75:.55;cx.fillStyle=d.c;cx.beginPath();cx.arc(px,py,r,0,TAU);cx.fill()}}
  if(!LITE){cx.globalAlpha=dk?.06:.9;cx.fillStyle=S.pat;cx.fillRect(0,y0,W,y1-y0)}
  cx.restore();cx.globalAlpha=1}

/* =====================================================================
   ПИКСЕЛЬ: игра-бродилка. Прокрутка вниз - мир едет вперёд (слои с разной скоростью)
   ===================================================================== */
var PX=4; // 1 игровой пиксель = 4 css-пикселя
function pixInit(){S.ps=[];for(var i=0;i<70;i++)S.ps.push({x:rnd(),y:rnd()*.55,p:rnd()*TAU});S.wx=0;S.cl=[];for(i=0;i<7;i++)S.cl.push({x:rnd()*300,y:6+rnd()*30,w:10+(rnd()*14|0),d:.15+rnd()*.25});
  S.buf=D.createElement('canvas');S.bx=S.buf.getContext('2d')}
function hsh(n){n=Math.sin(n*127.1)*43758.5453;return n-Math.floor(n)}
function pixel(t,dt,y0,y1,dk){if(!S.ps)pixInit();var w=Math.ceil(W/PX),h=Math.ceil(H/PX);if(S.buf.width!==w||S.buf.height!==h){S.buf.width=w;S.buf.height=h}
  var g=S.bx,sc=scrollY;S.wx+=dt*(.012+vel*.0001+boost*.06);var X=S.wx+sc*.25;
  var sky=dk?['#1d2b53','#29366f','#7e2553']:['#29adff','#5fcde4','#c2f3ff'];
  for(var i=0;i<3;i++){g.fillStyle=sky[i];g.fillRect(0,Math.floor(h*i*.22),w,Math.ceil(h*.22)+1)}g.fillStyle=sky[2];g.fillRect(0,Math.floor(h*.66),w,h);
  if(dk){for(i=0;i<S.ps.length;i++){var s=S.ps[i];if(Math.sin(t*.003+s.p)>-.3){g.fillStyle=Math.sin(t*.002+s.p)>.6?'#ffec27':'#fff1e8';g.fillRect(((s.x*w-X*.02)%w+w)%w|0,s.y*h|0,1,1)}}
    g.fillStyle='#fff1e8';var mxp=w*.8|0,myp=h*.16|0;g.fillRect(mxp-3,myp-4,7,9);g.fillRect(mxp-4,myp-3,9,7);g.fillStyle='#1d2b53';g.fillRect(mxp,myp-3,4,5)}
  else{g.fillStyle='#ffec27';var sxp=w*.8|0,syp=h*.15|0;g.fillRect(sxp-4,syp-5,9,11);g.fillRect(sxp-5,syp-4,11,9);g.fillStyle='#ffa300';g.fillRect(sxp-2,syp-2,5,5)}
  // облака
  for(i=0;i<S.cl.length;i++){var c=S.cl[i],cxx=(((c.x-X*c.d)%(w+60))+w+60)%(w+60)-30;g.fillStyle=dk?'#5f574f':'#fff1e8';g.fillRect(cxx|0,c.y,c.w,3);g.fillRect((cxx+2)|0,c.y-2,c.w-5,2)}
  // горы, холмы, земля - разная скорость = глубина
  function ridge(off,hgt,fr,amp,col,step){g.fillStyle=col;for(var x=0;x<w;x+=step){var wx=x+off,v=Math.sin(wx*fr)*amp+Math.sin(wx*fr*2.7+1.3)*amp*.4,hh=Math.floor(hgt+v);g.fillRect(x,h-hh,step,hh)}}
  ridge(X*.15,h*.42,.035,h*.08,dk?'#422136':'#83769c',1);
  ridge(X*.35,h*.3,.06,h*.05,dk?'#1f5c3f':'#00e436',1);
  // деревья на холмах
  var off=X*.35;for(var x=-(off%18);x<w;x+=18){var id=Math.floor((x+off)/18);if(hsh(id)<.45)continue;var wx=x+off,hh=Math.floor(h*.3+Math.sin(wx*.06)*h*.05+Math.sin(wx*.06*2.7+1.3)*h*.02),tx=x|0,ty=h-hh;
    g.fillStyle=dk?'#0b3d2a':'#008751';g.fillRect(tx,ty-7,5,6);g.fillRect(tx+1,ty-9,3,2);g.fillStyle=dk?'#5f3a1e':'#ab5236';g.fillRect(tx+2,ty-1,1,2)}
  ridge(X*.7,h*.14,.11,2,dk?'#3b2a1a':'#ab5236',1);g.fillStyle=dk?'#1f5c3f':'#00e436';var gx=X*.7;for(x=0;x<w;x++){var hh2=Math.floor(h*.14+Math.sin((x+gx)*.11)*2+Math.sin((x+gx)*.297+1.3)*.8);g.fillRect(x,h-hh2,1,2)}
  // домики у дороги
  off=X*.7;for(x=-(off%46);x<w;x+=46){id=Math.floor((x+off)/46);if(hsh(id+7)<.5)continue;var hx=x|0,hy=Math.floor(h-h*.14-1),col=['#ff004d','#29adff','#ffa300','#ff77a8'][(hsh(id+3)*4)|0];
    g.fillStyle=col;g.fillRect(hx,hy-8,11,8);g.fillStyle='#5f574f';g.fillRect(hx-1,hy-10,13,2);g.fillRect(hx+1,hy-12,9,2);g.fillStyle=dk&&hsh(id)>.3?'#ffec27':'#1d2b53';g.fillRect(hx+2,hy-6,3,3);g.fillStyle='#1d2b53';g.fillRect(hx+7,hy-5,2,5)}
  // дрон летит за пальцем
  var dx=Math.floor(w*(.25+mx*.5)+Math.sin(t*.0012)*6),dy=Math.floor(h*(.2+my*.25)+Math.sin(t*.002)*3);
  g.fillStyle='#c2c3c7';g.fillRect(dx-6,dy,13,2);g.fillStyle='#fff1e8';g.fillRect(dx-1,dy-1,3,4);g.fillStyle='#ff004d';g.fillRect(dx,dy+3,1,1);
  var f=Math.floor(t/50)%2;g.fillStyle='#29adff';g.fillRect(dx-8,dy-1-f,5,1);g.fillRect(dx+4,dy-2+f,5,1);
  cx.save();cx.beginPath();cx.rect(0,y0,W,y1-y0);cx.clip();cx.imageSmoothingEnabled=false;cx.globalAlpha=dk?1:.9;cx.drawImage(S.buf,0,0,w*PX,h*PX);cx.restore();cx.globalAlpha=1}

/* ---------- цикл ---------- */
var SCN={space:space,neon:neon,aqua:aqua,pixel:pixel};
var run=false,lt=0,acc=0,slow=0,frames=0;
function frame(ts){
  var dt=Math.min(60,ts-lt||16);
  sy=scrollY;var raw=(sy-psy)/Math.max(dt,1)*1000;psy=sy;vel+=(raw-vel)*Math.min(1,dt/120);if(Math.abs(vel)<1)vel=0;
  mx+=(tmx-mx)*Math.min(1,dt/260);my+=(tmy-my)*Math.min(1,dt/260);boost*=Math.exp(-dt/350);
  var k=skin(),dk=dark(),b=Math.min(H,band());
  cx.clearRect(0,0,W,H);
  var f=SCN[k]||neon;
  if(b>0){f(ts,dt,0,b,true);if(b<H)f(ts,0,b,H,false)}
  else f(ts,dt,0,H,dk);
}
var fa=0,fn=0,fpsEl=null,fq=/[?&]fps\b/.test(location.search);
function loop(ts){if(!run)return;requestAnimationFrame(loop);var dt=ts-lt;
  if(LITE&&dt<30)return; // телефоны: 30 кадров в секунду
  if(!LITE&&dt<12)return; // мониторы 120-144 Гц: не больше 60 кадров
  // компьютер не успевает - плавно снижаем разрешение фона (красота почти та же, а кадры ровные)
  if(dt<200){fa+=dt;fn++}
  if(fn>=45){var avg=fa/fn;fa=fn=0;
    if(avg>21&&Q>.55){Q=Math.max(.5,Q*.8);size(true)}else if(LITE===false&&avg>40&&Q<=.55){LITE=true;size()}
    if(fq){if(!fpsEl){fpsEl=D.createElement('div');fpsEl.style.cssText='position:fixed;right:8px;bottom:8px;z-index:99999;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,.75);color:#0f0;font:700 13px monospace;pointer-events:none';D.body.appendChild(fpsEl)}
      fpsEl.textContent=Math.round(1000/avg)+' fps · кадр '+avg.toFixed(1)+' мс · фон '+cv.width+'x'+cv.height+(LITE?' · лёгкий':'')}}
  frame(ts);lt=ts}
function start(){if(run||RED)return;run=true;lt=performance.now();requestAnimationFrame(loop)}
function stop(){run=false}
D.addEventListener('visibilitychange',function(){D.hidden?stop():start()});
function boot(){size();lastW=innerWidth;if(window.SKIN&&SKIN.on)SKIN.on(function(){S={};});D.querySelectorAll('[data-fx-skin]').forEach(skinButton);
  if(RED){frame(performance.now());return}start();}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot);else boot();
// смена светлой/тёмной темы: пересчитать
new MutationObserver(function(){if(RED)frame(performance.now())}).observe(R,{attributes:true,attributeFilter:['data-theme','data-skin']});

/* =====================================================================
   ЖИВЫЕ КНОПКИ: при нажатии сжимаются, при отпускании пружинят; круг-волна от пальца
   ===================================================================== */
var SEL='.btn,.cc,.chip,.vt button,nav.tb button,.qopt,.bd1,.pc,.lamp,.strs button,.ibtn,.dc,.grp,.lnk,.ev,.sko,.wd,.days button,.chip,.day,[data-join],nav.mn a,.brand';
var held=null;
var tiltR='0 0 1 0deg';
function squish(el,e){if(!el.animate)return;held=el;var big=el.matches('.dc,.grp,.ev,.lnk');tiltR='0 0 1 0deg';
  if(big&&e){var r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;tiltR=(-y).toFixed(3)+' '+x.toFixed(3)+' 0 '+(Math.hypot(x,y)*12).toFixed(2)+'deg';
    var pp=el.parentElement;if(pp&&!pp._fxp){pp._fxp=1;if(getComputedStyle(pp).perspective==='none')pp.style.perspective='1100px'}}
  el._fxa=el.animate([{scale:'1',rotate:'0 0 1 0deg'},{scale:big?'.97':'.92',rotate:tiltR}],{duration:140,easing:'cubic-bezier(.3,.7,.4,1)',fill:'forwards'})}
function release(){var el=held;held=null;if(!el||!el.animate)return;var big=el.matches('.dc,.grp,.ev,.lnk'),tr=tiltR;
  var a=el.animate(big?[{scale:'.97',rotate:tr},{scale:'1.015',rotate:'0 0 1 0deg'},{scale:'.997'},{scale:'1'}]:[{scale:'.92'},{scale:'1.08'},{scale:'.97'},{scale:'1.02'},{scale:'1'}],{duration:big?560:560,easing:'ease-out'});
  if(el._fxa){try{el._fxa.cancel()}catch(x){}el._fxa=null}}
function ripple(el,e){var r=el.getBoundingClientRect(),d=Math.max(r.width,r.height)*2.2,s=D.createElement('i');s.className='fxr';
  s.style.cssText='left:'+(e.clientX-r.left-d/2)+'px;top:'+(e.clientY-r.top-d/2)+'px;width:'+d+'px;height:'+d+'px';
  var host=el;if(getComputedStyle(host).position==='static')host.style.position='relative';host.appendChild(s);
  s.animate([{transform:'scale(0)',opacity:.45},{transform:'scale(1)',opacity:0}],{duration:650,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=function(){s.remove()}}
D.addEventListener('pointerdown',function(e){if(e.button>0)return;var el=e.target.closest&&e.target.closest(SEL);if(!el||el.disabled)return;squish(el,e);if(!RED&&el.matches('.btn,.ibtn,.sko,.lnk,.chip,[data-join],nav.mn a'))ripple(el,e)},{passive:true});
['pointerup','pointercancel','dragstart'].forEach(function(n){addEventListener(n,release,{passive:true})});
/* кнопка 🎨 для страниц кружков: каждое нажатие - следующий стиль фона */
function skinButton(btn){if(!btn)return;btn.addEventListener('click',function(){var i=SKINS.findIndex(function(x){return x[0]===skin()}),n=SKINS[(i+1)%SKINS.length];if(SKIN.set)SKIN.set(n[0]);
  var t=D.createElement('div');t.className='fxtip';t.textContent='Фон: '+n[1];D.body.appendChild(t);t.animate([{opacity:0,transform:'translate(-50%,10px)'},{opacity:1,transform:'translate(-50%,0)'},{opacity:1,offset:.8},{opacity:0}],{duration:1500,easing:'ease-out'}).onfinish=function(){t.remove()}})}
var st=D.createElement('style');st.textContent='.fxtip{position:fixed;left:50%;top:18px;z-index:9999;padding:9px 16px;border-radius:12px;background:rgba(10,8,25,.85);color:#fff;font:700 14px system-ui,sans-serif;pointer-events:none;border:1px solid rgba(255,255,255,.2)}';(D.head||R).appendChild(st);
window.FX={on:true,size:size,skinButton:skinButton};
})();
