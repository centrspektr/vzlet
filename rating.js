/* Взлёт: рейтинг на весь экран (проектор, ноутбук, телефон).
   Открывается адресом ...?rating=1 (кнопка "Рейтинг на весь экран" на сайте). Своя страница на тех же данных:
   листание трасс и классов дрона, пять видов просмотра, показ по кругу, ввод времени пилотами по PIN педагога.
   Рейтинга по очкам здесь нет - только время на трассе и классе дрона. Файл свой, внешних подключений нет. */
(function(){
'use strict';
var ON=/[?&]rating(=|&|$)/.test(location.search)||location.hash==='#rating';
var g=function(id){return document.getElementById(id)};
function rtUrl(){var u=selUrl();u.hash='';u.searchParams.set('rating','1');return u.toString()}
function siteUrl(){var u=selUrl();u.hash='';u.searchParams.delete('rating');return u.toString()}

/* ---------- кнопки на основном сайте (всегда) ---------- */
function addLinks(){
  if(window.VZ_NO_RT_LINKS)return;
  var mn=g('mnMenuList');
  if(mn&&!g('rtLink'))mn.insertAdjacentHTML('afterend','<a class="mn-row rt-mn" id="rtLink" href="'+rtUrl()+'">Рейтинг на весь экран</a>');
  var h=document.querySelector('#plPod>h3');
  if(h&&!h.querySelector('.rt-hb')){var sp=h.querySelector('.sp');var a=document.createElement('a');a.className='rt-hb';a.href=rtUrl();a.title='Рейтинг на весь экран - для проектора и ноутбука';a.textContent='На весь экран';a.addEventListener('click',function(e){e.stopPropagation()});if(sp)h.insertBefore(a,sp);else h.appendChild(a)}
  var box=g('sr');
  if(box&&!box.querySelector('.rt-open'))box.insertAdjacentHTML('afterbegin','<a class="rt-open" href="'+rtUrl()+'">Открыть рейтинг на весь экран<small>для проектора, ноутбука и телефона</small></a>');
}
addLinks();
(function(){var pod=g('plPod');if(!pod||!window.MutationObserver)return;var busy=0;new MutationObserver(function(){if(busy)return;busy=1;try{addLinks()}catch(e){}busy=0}).observe(pod,{childList:true,subtree:true})})();
if(!ON)return;

/* ---------- режим "Рейтинг" ---------- */
var LSK='vzlet_rt',RT={sim:'',d:'',t:'',view:'track',pilot:'',h3:0,auto:0,mine:[]};
try{var sv=JSON.parse(localStorage.getItem(LSK)||'{}');['sim','d','t','view','h3'].forEach(function(k){if(sv[k]!==undefined)RT[k]=sv[k]})}catch(e){}
if(!RT.sim)RT.sim=(window.SRX&&window.SRX.SR.sim)||'';
if(!RT.d)RT.d=(window.SRX&&window.SRX.SR.d)||'';
function save(){try{localStorage.setItem(LSK,JSON.stringify({sim:RT.sim,d:RT.d,t:RT.t,view:RT.view,h3:RT.h3}))}catch(e){}}
var E={open:0,pilot:'',isNew:0,q:'',crash:0,res:null};
/* 24.11: строгий вид - места тонкими кольцами в приглушённых цветах металла, без эмодзи */
var MEDAL=['<s class="rm m1">1</s>','<s class="rm m2">2</s>','<s class="rm m3">3</s>'];
var VIEWS=[['track','','Трасса'],['medals','','Медали'],['matrix','','Все трассы'],['pilot','','Пилот'],['feed','','Лента'],['rec','','Рекорды']];
function fmt(sec){sec=Math.round(sec*100+1e-6)/100;var m=Math.floor(sec/60),r=sec-m*60;return m?m+':'+r.toFixed(2).padStart(5,'0'):r.toFixed(2)}
function sims(){return window.SRX.srSims()}
function tracksOf(s){return window.SRX.srTracks(s)}
function srBest(L,t){var m={};L.forEach(function(l){if(l.track!==t)return;var k=normName(l.pilot);if(!m[k]||l.sec<m[k].sec)m[k]=l});return m}
function lapsDS(s,d){return laps().filter(function(l){return l.drone===d&&simOf(l.track)===s})}
function board(t,d){return Object.values(srBest(laps().filter(function(l){return l.drone===d}),t)).sort(function(a,b){return a.sec-b.sec})}
function hasRes(t,d){return laps().some(function(l){return l.track===t&&l.drone===d})}
var picked=0;
function fix(){
  var S=sims();if(S.indexOf(RT.sim)<0)RT.sim=S[0];
  if(DTYPES.indexOf(RT.d)<0)RT.d=DTYPES[0];
  if(!picked&&laps().length){picked=1;var L=laps(),cnt=function(f){return L.filter(f).length};
    if(!cnt(function(l){return simOf(l.track)===RT.sim}))RT.sim=S.slice().sort(function(a,b){return cnt(function(l){return simOf(l.track)===b})-cnt(function(l){return simOf(l.track)===a})})[0];
    if(!cnt(function(l){return l.drone===RT.d&&simOf(l.track)===RT.sim}))RT.d=DTYPES.slice().sort(function(a,b){return cnt(function(l){return l.drone===b&&simOf(l.track)===RT.sim})-cnt(function(l){return l.drone===a&&simOf(l.track)===RT.sim})})[0];
    RT.t=''}
  var TS=tracksOf(RT.sim);
  if(TS.indexOf(RT.t)<0)RT.t=TS.filter(function(t){return hasRes(t,RT.d)})[0]||TS[0]||'';
  return TS;
}
function canWrite(){return !!ROLE}

/* ---------- каркас ---------- */
var root=document.createElement('div');root.id='rtScreen';root.setAttribute('role','main');
root.innerHTML='<div class="rt-top" id="rtTop"></div><div class="rt-ctl" id="rtCtl"></div><div class="rt-main" id="rtMain"></div><button type="button" class="rt-fab" id="rtFab"></button><div class="rt-ent" id="rtEnt" hidden></div>';
document.body.appendChild(root);

function topDraw(){
  var vil=VIEW==='all'?'все площадки':(VIEW==='irtysh'?'с. Иртыш':seloName(VIEW));
  var sel=(SELA&&SELA.length>1)?'<select id="rtVil" aria-label="Площадка">'+SELA.map(function(s){return '<option value="'+esc(s.id)+'"'+(s.id===VIEW?' selected':'')+'>'+esc(s.name)+'</option>'}).join('')+'<option value="all"'+(VIEW==='all'?' selected':'')+'>Все площадки</option></select>':'';
  var role=ROLE?'<button type="button" class="rt-b" id="rtPin">Выйти<span class="rt-rl"> · '+(ROLE==='admin'?'Тренер':ROLE==='teacher'?'Педагог':'Помощник')+'</span></button>':'<button type="button" class="rt-b rt-pinb" id="rtPin">Войти</button>';
  g('rtTop').innerHTML='<div class="rt-ttl"><b>Рейтинг клуба "Взлёт"</b><small>'+esc(vil)+'</small></div><div class="rt-tools">'+sel+
   '<button type="button" class="rt-b'+(RT.auto?' on':'')+'" id="rtAuto" title="Листать трассы само (клавиша Пробел)">'+(RT.auto?'Пауза':'Показ')+'</button>'+
   (document.fullscreenEnabled&&!window.VZ_NO_RT_LINKS?'<button type="button" class="rt-b" id="rtFs" title="Во весь экран (клавиша F)">Весь экран</button>':'')+role+
   '<a class="rt-b rt-back" href="'+siteUrl()+'">На сайт</a></div>';
  var v=g('rtVil');if(v)v.onchange=function(){var u=selUrl();u.hash='';u.searchParams.set('selo',v.value);u.searchParams.set('rating','1');location.href=u.toString()};
  g('rtPin').onclick=function(){if(ROLE){logout()}else openLogin()};
  g('rtAuto').onclick=function(){setAuto(!RT.auto)};
  var f=g('rtFs');if(f)f.onclick=toggleFs;
}
function toggleFs(){try{if(document.fullscreenElement)document.exitFullscreen();else document.documentElement.requestFullscreen()}catch(e){}}
document.addEventListener('fullscreenchange',function(){var f=g('rtFs');if(f)f.textContent=document.fullscreenElement?'Обычный вид':'Весь экран'});

function ctlDraw(){
  var TS=fix(),S=sims();
  var nD=function(d){return new Set(lapsDS(RT.sim,d).map(function(l){return normName(l.pilot)+'|'+l.track})).size};
  var h='<div class="rt-row"><div class="rt-seg" id="rtSim">'+S.map(function(m){return '<button type="button" class="'+(m===RT.sim?'on':'')+'" data-m="'+esc(m)+'">'+esc(simLbl(m))+'</button>'}).join('')+'</div>'+
   '<div class="rt-seg" id="rtDr">'+DTYPES.map(function(d){return '<button type="button" class="'+(d===RT.d?'on':'')+'" data-d="'+esc(d)+'">'+esc(d)+'<small>'+nD(d)+'</small></button>'}).join('')+'</div></div>';
  h+='<div class="rt-row rt-trk"><button type="button" class="rt-arr" id="rtPrev" aria-label="Предыдущая трасса">‹</button><div class="rt-chips" id="rtTr">'+
   (TS.length?TS.map(function(t){return '<button type="button" class="'+(t===RT.t?'on':'')+(hasRes(t,RT.d)?'':' no')+'" data-t="'+esc(t)+'" title="'+esc(trkFull(t)||t)+'">'+esc(t)+'</button>'}).join(''):'<span class="rt-dim">Трасс у этого симулятора пока нет</span>')+
   '</div><button type="button" class="rt-arr" id="rtNext" aria-label="Следующая трасса">›</button></div>';
  h+='<div class="rt-tabs" id="rtTabs">'+VIEWS.map(function(v){return '<button type="button" class="'+(v[0]===RT.view?'on':'')+'" data-v="'+v[0]+'"><i>'+v[1]+'</i>'+v[2]+'</button>'}).join('')+'</div>';
  g('rtCtl').innerHTML=h;
  g('rtSim').onclick=function(e){var b=e.target.closest('button');if(!b||b.dataset.m===RT.sim)return;RT.sim=b.dataset.m;RT.t='';save();stopAutoSoft();all()};
  g('rtDr').onclick=function(e){var b=e.target.closest('button');if(!b||b.dataset.d===RT.d)return;RT.d=b.dataset.d;save();stopAutoSoft();all()};
  g('rtTr').onclick=function(e){var b=e.target.closest('button');if(!b)return;RT.t=b.dataset.t;save();stopAutoSoft();all()};
  g('rtTabs').onclick=function(e){var b=e.target.closest('button');if(!b)return;RT.view=b.dataset.v;save();all()};
  g('rtPrev').onclick=function(){stopAutoSoft();step(-1)};g('rtNext').onclick=function(){stopAutoSoft();step(1)};
  var on=g('rtTr').querySelector('.on');if(on)on.scrollIntoView({block:'nearest',inline:'center'});
  fabDraw();
}
function step(k){var TS=fix();if(!TS.length)return;var i=TS.indexOf(RT.t);RT.t=TS[(i+k+TS.length)%TS.length];save();all(true)}
function fabDraw(){var b=g('rtFab');if(!b)return;b.hidden=!!E.open;
  b.innerHTML=canWrite()?'Вписать время':'Войти по PIN';
  b.className='rt-fab'+(canWrite()?' go':'');
  b.onclick=function(){if(canWrite())openEntry();else openLogin()}}

/* ---------- виды ---------- */
function none(t,s){return '<div class="rt-none"><b>'+t+'</b><span>'+s+'</span></div>'}
function viewTrack(){
  var t=RT.t,d=RT.d;if(!t)return none('Трасс пока нет','Тренер добавит трассы на сайте.');
  var rows=board(t,d),top=rows.length?rows[0].sec:0,full=trkFull(t);
  var h='<div class="rt-hd"><h2>'+esc(t)+'</h2><span class="rt-d">'+esc(d)+'</span>'+(rows.length?'<span class="rt-n">'+rows.length+' '+plural(rows.length,'пилот','пилота','пилотов')+'</span>':'')+'</div>'+(full?'<p class="rt-full">'+esc(full)+'</p>':'');
  if(!rows.length)return h+none('На этой трассе с классом «'+esc(d)+'» заездов ещё нет',canWrite()?'Нажмите «Вписать время» - и первым станет тот, кто полетит.':'Выберите другой класс дрона или другую трассу.');
  var pod=RT.h3?[]:rows.slice(0,3),rest=RT.h3?rows:rows.slice(3);
  if(pod.length)h+='<div class="rt-pod">'+pod.map(function(r,i){return '<button type="button" class="rt-pc p'+(i+1)+'" data-p="'+esc(r.pilot)+'" style="--i:'+i+'"><i>'+MEDAL[i]+'</i><b>'+esc(pnm(r.pilot))+'</b><em>'+fmt(r.sec)+'</em><small>'+(i?'+'+(r.sec-top).toFixed(2)+' с':'лидер')+(r.model?' · '+esc(r.model):'')+(r.crash?' · аварий: '+r.crash:'')+'</small></button>'}).join('')+'</div>';
  h+='<div class="rt-h3"><button type="button" id="rtH3" class="rt-b'+(RT.h3?' on':'')+'">'+(RT.h3?'Показать топ-3':'Скрыть топ-3')+'</button></div>';
  if(rest.length)h+='<div class="rt-list">'+rest.map(function(r,k){var i=RT.h3?k:k+3;return '<button type="button" class="rt-r" data-p="'+esc(r.pilot)+'" style="--i:'+Math.min(k,14)+';--w:'+(100*top/r.sec).toFixed(0)+'%"><i>'+(RT.h3&&i<3?MEDAL[i]:i+1)+'</i><span class="n"><b>'+esc(pnm(r.pilot))+'</b><small>'+(r.model?esc(r.model)+' · ':'')+(r.crash?'аварий: '+r.crash:'без аварий')+'</small></span><em>'+fmt(r.sec)+'</em><u>+'+(r.sec-top).toFixed(2)+'</u></button>'}).join('')+'</div>';
  return h;
}
function viewMedals(){
  var d=RT.d,TS=tracksOf(RT.sim).filter(function(t){return hasRes(t,d)});
  if(!TS.length)return none('Для класса «'+esc(d)+'» заездов пока нет','Выберите другой класс дрона сверху.');
  var M={};TS.forEach(function(t){board(t,d).forEach(function(l,i){var k=normName(l.pilot);var o=M[k]=M[k]||{name:l.pilot,m:[0,0,0],n:0};o.n++;if(i<3)o.m[i]++})});
  var R=Object.values(M).sort(function(a,b){return b.m[0]-a.m[0]||b.m[1]-a.m[1]||b.m[2]-a.m[2]||b.n-a.n||String(a.name).localeCompare(String(b.name),'ru')});
  var h='<div class="rt-hd"><h2>Медали по трассам</h2><span class="rt-d">'+esc(d)+'</span><span class="rt-n">'+TS.length+' '+plural(TS.length,'трасса','трассы','трасс')+' с заездами</span></div>'+
   '<p class="rt-full">На каждой трассе 1-е место - золото, 2-е - серебро, 3-е - бронза. Выше тот, у кого больше золота, потом серебра, потом бронзы. Очков нет.</p>';
  return h+'<div class="rt-list">'+R.map(function(o,i){return '<button type="button" class="rt-r feed" data-p="'+esc(o.name)+'" style="--i:'+Math.min(i,14)+'"><i>'+(i+1)+'</i><span class="n"><b>'+esc(pnm(o.name))+'</b><small>летал на '+o.n+' из '+TS.length+'</small></span><em class="md"><s class="rd m1"></s>'+o.m[0]+' <s class="rd m2"></s>'+o.m[1]+' <s class="rd m3"></s>'+o.m[2]+'</em><u></u></button>'}).join('')+'</div>';
}
function viewMatrix(){
  var d=RT.d,TS=tracksOf(RT.sim).filter(function(t){return hasRes(t,d)});
  if(!TS.length)return none('Для класса «'+esc(d)+'» заездов пока нет','Выберите другой класс дрона сверху.');
  var M=TS.map(function(t){return srBest(laps().filter(function(l){return l.drone===d}),t)}),B=M.map(function(m){return Math.min.apply(null,Object.values(m).map(function(l){return l.sec}))});
  var P=allPilots().map(function(p){var k=normName(p['Пилот']),n=0;M.forEach(function(m){if(m[k])n++});return{name:p['Пилот'],k:k,n:n}}).filter(function(p){return p.n}).sort(function(a,b){return b.n-a.n||String(a.name).localeCompare(String(b.name),'ru')});
  return '<div class="rt-hd"><h2>Все трассы</h2><span class="rt-d">'+esc(d)+'</span><span class="rt-n">золотым - лучшее время на трассе</span></div><div class="rt-mx"><table><thead><tr><th>Пилот</th>'+TS.map(function(t){return '<th>'+esc(t)+'</th>'}).join('')+'</tr></thead><tbody>'+
   P.map(function(p){return '<tr><td><button type="button" data-p="'+esc(p.name)+'">'+esc(pnm(p.name))+'</button></td>'+M.map(function(m,i){var l=m[p.k];return l?'<td class="'+(l.sec===B[i]?'best':'')+'">'+fmt(l.sec)+'</td>':'<td class="x">-</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>';
}
function viewPilot(){
  var PL=allPilots().map(function(p){return p['Пилот']}).filter(function(n){var k=normName(n);return laps().some(function(l){return normName(l.pilot)===k})}).sort(function(a,b){return String(a).localeCompare(String(b),'ru')});
  if(!PL.length)return none('Пока нет ни одного заезда','');
  if(!RT.pilot||PL.map(normName).indexOf(normName(RT.pilot))<0)RT.pilot=PL[0];
  var k=normName(RT.pilot),L=laps().filter(function(l){return normName(l.pilot)===k});
  var h='<div class="rt-hd"><h2>Пилот</h2></div><div class="rt-chips wrap" id="rtPl">'+PL.map(function(n){return '<button type="button" class="'+(normName(n)===k?'on':'')+'" data-n="'+esc(n)+'">'+esc(pnm(n))+'</button>'}).join('')+'</div>';
  h+='<div class="rt-pcard"><h3>'+esc(pnm(RT.pilot))+'</h3>';
  var any=0;
  DTYPES.forEach(function(d){
    var mine=Object.values(srBest(L.filter(function(l){return l.drone===d}),'')).length;
    var ts=[...new Set(L.filter(function(l){return l.drone===d}).map(function(l){return l.track}))];
    if(!ts.length)return;any=1;
    h+='<div class="rt-ps"><b>'+esc(d)+'</b>'+ts.map(function(t){var B=board(t,d),i=B.findIndex(function(l){return normName(l.pilot)===k}),l=B[i];return l?'<div class="rt-pr"><span>'+esc(t)+'</span><em>'+fmt(l.sec)+'</em><u>'+(i<3?MEDAL[i]+' ':'')+(i+1)+'-е из '+B.length+'</u>'+(l.model?'<small>'+esc(l.model)+'</small>':'')+'</div>':''}).join('')+'</div>'});
  if(!any)h+=none('У пилота нет заездов с классом дрона','');
  return h+'</div>';
}
function viewFeed(){
  var L=laps().slice(-30).reverse();
  if(!L.length)return none('Заездов пока нет','');
  return '<div class="rt-hd"><h2>Последние записи</h2></div><div class="rt-list">'+L.map(function(l,k){var B=l.drone?board(l.track,l.drone):[],i=B.findIndex(function(x){return normName(x.pilot)===normName(l.pilot)}),isB=i>=0&&B[i].sec===l.sec;
    return '<button type="button" class="rt-r feed" data-p="'+esc(l.pilot)+'" style="--i:'+Math.min(k,14)+'"><i>'+'·'+'</i><span class="n"><b>'+esc(pnm(l.pilot))+'</b><small>'+esc(l.track)+' · '+esc(l.drone||'без класса')+(l.date?' · '+esc(l.date):'')+(l.crash?' · аварий: '+l.crash:'')+'</small></span><em>'+fmt(l.sec)+'</em><u>'+(isB?'место '+(i+1):'не лучшее')+'</u></button>'}).join('')+'</div>';
}
function viewRec(){
  var TS=tracksOf(RT.sim);
  if(!TS.length)return none('Трасс пока нет','');
  return '<div class="rt-hd"><h2>Рекорды трасс</h2><span class="rt-n">'+esc(simLbl(RT.sim))+'</span></div><div class="rt-recs">'+TS.map(function(t){
    var rows=DTYPES.map(function(d){var b=board(t,d)[0];return b?'<div class="rt-rr"><span>'+esc(d)+'</span><b>'+esc(pnm(b.pilot))+'</b><em>'+fmt(b.sec)+'</em></div>':''}).join('');
    return '<div class="rt-rc"><h3>'+esc(t)+'</h3>'+(rows||'<p class="rt-dim">Пока никто не летал</p>')+'</div>'}).join('')+'</div>';
}
function mainDraw(anim){
  var m=g('rtMain'),h;
  if(typeof source!=='undefined'&&source==='sample'&&!laps().length)h=none('Загружаю данные…','Если долго - проверьте интернет.');
  else h=({track:viewTrack,medals:viewMedals,matrix:viewMatrix,pilot:viewPilot,feed:viewFeed,rec:viewRec}[RT.view]||viewTrack)();
  m.innerHTML='<div class="rt-in'+(anim?' an':'')+'">'+h+'</div>'+(RT.auto?'<div class="rt-prog"><i></i></div>':'');
  m.querySelectorAll('[data-p]').forEach(function(b){b.onclick=function(){openPilot(b.dataset.p)}});
  var h3=g('rtH3');if(h3)h3.onclick=function(){RT.h3=RT.h3?0:1;save();mainDraw(1)};
  var pl=g('rtPl');if(pl)pl.onclick=function(e){var b=e.target.closest('button');if(!b)return;RT.pilot=b.dataset.n;mainDraw(1)};
}
function all(anim){ctlDraw();topDraw();mainDraw(anim!==false)}

/* ---------- показ по кругу ---------- */
var timer=null;
function combos(){var out=[];tracksOf(RT.sim).forEach(function(t){DTYPES.forEach(function(d){if(hasRes(t,d))out.push([t,d])})});return out}
function setAuto(v){RT.auto=v?1:0;clearInterval(timer);timer=null;
  if(RT.auto){if(RT.view!=='track'){RT.view='track'}
    timer=setInterval(function(){if(document.hidden||E.open||document.querySelector('.modal.open'))return;
      var C=combos();if(!C.length)return;var i=C.findIndex(function(c){return c[0]===RT.t&&c[1]===RT.d});var n=C[(i+1)%C.length];RT.t=n[0];RT.d=n[1];all(true)},12000)}
  all(true)}
function stopAutoSoft(){if(RT.auto){RT.auto=0;clearInterval(timer);timer=null}}

/* ---------- ввод времени ---------- */
function mineRows(){return(data['Заезды']||[]).filter(function(l){return dkey(l['Дата'])===todayStr()}).map(function(l){return{'Пилот':l['Пилот'],'Трасса':l['Трасса'],'Время круга':l['Время круга'],'Формат':l['Формат'],'Аварии':l['Аварии'],'Дрон':l['Дрон']}})}
async function helperPush(out){
  var r=await api({op:'todayLaps',key:ss_.get(PIN_KEY),selo:VIEW,laps:out});
  if(!r.ok){if(/Неверный PIN/i.test(r.error||''))logout(true);throw new Error(r.error||'ошибка')}
  RAW['Заезды']=r.laps;RAW['Пилоты']=[].concat(RAW['Пилоты']||[],r.pilots||[]);data['Трассы']=[].concat(data['Трассы']||[],r.tracks||[]);
  applySelo();ls.set(CACHE_KEY,JSON.stringify({t:Date.now(),id:sheetId(),data:RAW,sela:SELA}));
}
function rawOf(l){var z=(data['Заезды']||[])[l._i]||{};return{'Пилот':z['Пилот'],'Трасса':l.track,'Время круга':z['Время круга'],'Дрон':l.droneRaw,'Аварии':String(l.crash)}}
function sameRow(a,b){return['Пилот','Трасса','Время круга','Дрон','Аварии'].every(function(k){return String(a[k]||'')===String(b[k]||'')})}
async function addLap(row){
  if(ROLE==='helper'){await helperPush(mineRows().concat([row]))}
  else{await postSheet('Заезды',(data['Заезды']||[]).concat([Object.assign({'Дата':todayStr()},row)]))}
}
async function delLap(row){
  if(ROLE==='helper'){var m=mineRows(),i=-1;m.forEach(function(x,k){if(sameRow(x,row))i=k});if(i<0)throw new Error('запись уже не найдена');m.splice(i,1);await helperPush(m)}
  else{var Z=(data['Заезды']||[]).slice(),j=-1;Z.forEach(function(x,k){if(sameRow(x,row))j=k});if(j<0)throw new Error('запись уже не найдена');Z.splice(j,1);await postSheet('Заезды',Z)}
}
function openEntry(){
  if(!canWrite())return openLogin();
  if(VIEW==='all'&&ROLE==='helper')return toast('Выберите свою площадку вверху','bad');
  if(selRO()||(MY_SELO&&VIEW!==MY_SELO&&ROLE!=='admin'))return toast('Записывать можно только на своей площадке: '+seloName(MY_SELO),'bad');
  fix();E.open=1;E.pilot='';E.isNew=0;E.q='';E.crash=0;E.res=null;
  var el=g('rtEnt');el.hidden=false;
  el.innerHTML='<div class="re-card"><div class="re-h"><b>Вписать время</b><button type="button" class="rt-b on" id="reX">Готово</button></div>'+
   '<div class="re-ctx" id="reCtx"></div><div class="re-cols"><section class="re-l"><div class="re-lb">1. Кто летал</div><input id="reQ" class="re-q" type="search" autocomplete="off" placeholder="Начни вводить имя"><div id="rePl" class="re-grid"></div></section><section class="re-r" id="reForm"></section></div></div>';
  g('reX').onclick=closeEntry;
  g('reQ').oninput=function(){E.q=this.value;plDraw()};
  fabDraw();ctxDraw();plDraw();formDraw();
}
function closeEntry(){E.open=0;g('rtEnt').hidden=true;g('rtEnt').innerHTML='';fabDraw();all(false)}
function ctxDraw(){var TS=tracksOf(RT.sim),c=g('reCtx');if(!c)return;
  c.innerHTML=(sims().length>1?'<div class="re-l2">Симулятор</div><div class="rt-seg" id="reSim">'+sims().map(function(m){return '<button type="button" class="'+(m===RT.sim?'on':'')+'" data-m="'+esc(m)+'">'+esc(simLbl(m))+'</button>'}).join('')+'</div>':'')+
   '<div class="re-l2">Трасса</div><div class="rt-chips wrap" id="reTr">'+(TS.length?TS.map(function(t){return '<button type="button" class="'+(t===RT.t?'on':'')+'" data-t="'+esc(t)+'">'+esc(t)+'</button>'}).join(''):'<span class="rt-dim">Нет трасс - добавьте на сайте</span>')+'</div>'+
   '<div class="re-l2">Класс дрона</div><div class="rt-seg" id="reDr">'+DTYPES.map(function(d){return '<button type="button" class="'+(d===RT.d?'on':'')+'" data-d="'+esc(d)+'">'+esc(d)+'</button>'}).join('')+'</div>';
  g('reTr').onclick=function(e){var b=e.target.closest('button');if(!b)return;RT.t=b.dataset.t;save();ctxDraw();plDraw();formDraw()};
  g('reDr').onclick=function(e){var b=e.target.closest('button');if(!b)return;RT.d=b.dataset.d;save();ctxDraw();plDraw();formDraw()};
  var s=g('reSim');if(s)s.onclick=function(e){var b=e.target.closest('button');if(!b||b.dataset.m===RT.sim)return;RT.sim=b.dataset.m;RT.t='';fix();save();ctxDraw();plDraw();formDraw()};
  var on=g('reTr').querySelector('.on');if(on)on.scrollIntoView({block:'nearest'});
}
function plDraw(){var box=g('rePl');if(!box)return;
  var qn=normName(E.q),P=allPilots().map(function(p){return p['Пилот']}).sort(function(a,b){return String(a).localeCompare(String(b),'ru')});
  var best={};Object.values(srBest(laps().filter(function(l){return l.drone===RT.d}),RT.t)).forEach(function(l){best[normName(l.pilot)]=l.sec});
  var F=P.filter(function(n){return !qn||normName(n).indexOf(qn)>=0}),h=F.map(function(n){var b=best[normName(n)];return '<button type="button" class="'+(normName(n)===normName(E.pilot)&&!E.isNew?'on':'')+'" data-n="'+esc(n)+'"><b>'+esc(pnm(n))+'</b>'+(b?'<small>'+fmt(b)+'</small>':'')+'</button>'}).join('');
  var q=E.q.trim().replace(/\s+/g,' ');
  if(q&&!P.some(function(n){return normName(n)===qn}))h+='<button type="button" class="new" data-new="'+esc(q)+'"><b>+ Новый пилот</b><small>«'+esc(q)+'»</small></button>';
  if(!h)h='<span class="rt-dim">Пилотов пока нет. Впишите имя и класс в поиск - например «Иван (7 класс)».</span>';
  box.innerHTML=h;
  box.onclick=function(e){var b=e.target.closest('button');if(!b)return;
    if(b.dataset.new){E.pilot=b.dataset.new;E.isNew=1}else{E.pilot=b.dataset.n;E.isNew=0}
    E.crash=0;E.res=null;plDraw();formDraw(true);if(innerWidth<=820)setTimeout(function(){var r=g('reForm');if(r)r.scrollIntoView({behavior:'smooth',block:'start'})},40)};
}
function curBest(name){var k=normName(name),b=null;laps().forEach(function(l){if(l.track===RT.t&&l.drone===RT.d&&normName(l.pilot)===k&&(!b||l.sec<b.sec))b=l});return b}
function placeOf(name,sec){var k=normName(name),n=0,tot=0;board(RT.t,RT.d).forEach(function(l){if(normName(l.pilot)===k)return;tot++;if(l.sec<sec)n++});return{p:n+1,of:tot+1}}
function formDraw(focus){var f=g('reForm');if(!f)return;
  var recent=laps().slice(-6).reverse();
  var rec='<div class="re-lb">Последние записи</div>'+(recent.length?recent.map(function(l){var mine=RT.mine.some(function(r){return sameRow(r,rawOf(l))});
    return '<div class="re-rc"><span><b>'+esc(pnm(l.pilot))+'</b> · '+esc(l.track)+' · '+esc(l.drone||'-')+'</span><em>'+fmt(l.sec)+'</em>'+(mine?'<button type="button" data-u="'+l._i+'" title="Отменить эту запись">↩</button>':'')+'</div>'}).join(''):'<p class="rt-dim">Пока пусто</p>');
  if(!E.pilot){
    f.innerHTML=(E.res?'<div class="re-ok"><b>'+esc(E.res.name)+'</b><em>'+fmt(E.res.sec)+'</em><span>'+esc(E.res.t)+' · '+esc(E.res.d)+'</span><strong>'+(E.res.p?E.res.p+'-е место из '+E.res.of:'')+'</strong>'+(E.res.pb?'<small>'+E.res.pb+'</small>':'')+'</div>':'<div class="re-hint">Выбери пилота слева, потом впиши время</div>')+rec;
    bindRecent(f);return}
  var cb=curBest(E.pilot),md=E.isNew?'':lastModel(E.pilot,RT.d);
  f.innerHTML='<div class="re-lb">2. Время</div><div class="re-who"><b>'+esc(pnm(E.pilot))+'</b>'+(E.isNew?'<span>новый пилот</span>':'')+'<button type="button" id="reBack" title="Выбрать другого">×</button></div>'+
   '<div class="re-ctxl">'+esc(RT.t||'выберите трассу')+' · '+esc(RT.d)+'</div>'+
   (cb?'<div class="re-was">Сейчас лучшее: <b>'+fmt(cb.sec)+'</b></div>':'')+
   '<input id="reT" class="re-time" type="text" inputmode="text" enterkeyhint="done" autocomplete="off" placeholder="49.35" aria-label="Время круга">'+
   '<div class="re-pre" id="rePre">Например 49.35 или 1:05.32</div>'+
   '<div class="re-cr"><span>Аварии</span><button type="button" id="reCm" aria-label="Меньше">−</button><b id="reCn">'+E.crash+'</b><button type="button" id="reCp" aria-label="Больше">+</button></div>'+
   '<details class="re-md"><summary>Модель дрона (по желанию)</summary><input id="reM" list="reMl" maxlength="30" placeholder="-" value="'+esc(md)+'"><datalist id="reMl">'+(DMODELS[RT.d]||[]).map(function(m){return '<option value="'+esc(m)+'">'}).join('')+'</datalist></details>'+
   '<button type="button" class="re-save" id="reS">Записать</button>'+rec;
  var T=g('reT');
  T.oninput=function(){var s=lapSec(T.value.trim().replace(',','.')),p=g('rePre');
    if(!T.value.trim()){p.textContent='Например 49.35 или 1:05.32';p.className='re-pre';return}
    if(!s){p.textContent='Не похоже на время. Пример: 49.35 или 1:05.32';p.className='re-pre bad';return}
    var pl=placeOf(E.pilot,s),txt=fmt(s)+' - будет '+pl.p+'-е место из '+pl.of;
    if(cb)txt+=s<cb.sec?' · лучше на '+(cb.sec-s).toFixed(2)+' с':s===cb.sec?' · как лучшее':' · не лучше прежнего ('+fmt(cb.sec)+') - в рейтинге останется лучшее';
    p.textContent=txt;p.className='re-pre ok'};
  T.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();doSave()}};
  g('reCm').onclick=function(){E.crash=Math.max(0,E.crash-1);g('reCn').textContent=E.crash};
  g('reCp').onclick=function(){E.crash++;g('reCn').textContent=E.crash};
  g('reBack').onclick=function(){E.pilot='';E.isNew=0;plDraw();formDraw()};
  g('reS').onclick=doSave;
  bindRecent(f);
  if(focus!==false)setTimeout(function(){try{T.focus()}catch(e){}},60);
}
function bindRecent(f){f.querySelectorAll('[data-u]').forEach(function(b){b.onclick=async function(){
  var l=laps().filter(function(x){return x._i===+b.dataset.u})[0];if(!l)return;
  if(!confirm('Отменить запись: '+pnm(l.pilot)+' - '+fmt(l.sec)+'?'))return;
  b.disabled=true;
  try{await delLap(rawOf(l));
    toast('Запись отменена','ok');renderAll();ctxDraw();plDraw();formDraw(false)}
  catch(e){toast('Не отменилось: '+e.message,'bad');b.disabled=false}}})}
var busy=0;
async function doSave(){
  if(busy)return;
  var name=E.pilot,T=RT.t,D=RT.d;
  if(!name)return toast('Выберите пилота','bad');
  if(!T)return toast('Выберите трассу','bad');
  if(!D)return toast('Выберите класс дрона','bad');
  var raw=g('reT').value.trim().replace(',','.');
  if(!lapSec(raw))return toast('Проверьте время - пример 49.35 или 1:05.32','bad');
  var md=(g('reM')?g('reM').value:'').trim().replace(/\s+/g,' ').replace(/\//g,' ');
  var row={'Пилот':name,'Трасса':T,'Время круга':lapStore(raw),'Формат':trackFmt(T)||RT.sim,'Аварии':String(E.crash),'Дрон':dStore(D,md)};
  var sec=lapSec(raw),prev=curBest(name),btn=g('reS');
  busy=1;btn.disabled=true;btn.textContent='Записываю…';
  try{await addLap(row);RT.mine.push(row);curTrack=T;
    var pl=placeOf(name,Math.min(sec,prev?prev.sec:Infinity));
    E.res={name:pnm(name),sec:sec,t:T,d:D,p:pl.p,of:pl.of,pb:prev?(sec<prev.sec?'Личный рекорд! Лучше на '+(prev.sec-sec).toFixed(2)+' с':'Лучшее время осталось '+fmt(prev.sec)):'Первое время на этой трассе'};
    E.pilot='';E.isNew=0;E.q='';E.crash=0;var q=g('reQ');if(q)q.value='';
    renderAll();plDraw();formDraw(false);toast('Записано','ok');
    setTimeout(function(){var qq=g('reQ');if(qq){if(/Mobi|Android|iPhone/i.test(navigator.userAgent))qq.scrollIntoView({block:'center'});else qq.focus()}},60)}
  catch(e){toast('Не записалось: '+e.message,'bad');var b=g('reS');if(b){b.disabled=false;b.textContent='Записать'}}
  busy=0;
}

/* ---------- управление ---------- */
document.addEventListener('keydown',function(e){
  var tag=(e.target&&e.target.tagName)||'';if(/INPUT|SELECT|TEXTAREA/.test(tag)){if(e.key==='Escape'&&E.open)closeEntry();return}
  if(document.querySelector('.modal.open'))return;
  if(E.open){if(e.key==='Escape')closeEntry();return}
  var k=e.key;
  if(k==='ArrowRight'){stopAutoSoft();step(1)}
  else if(k==='ArrowLeft'){stopAutoSoft();step(-1)}
  else if(k>='1'&&k<='3'){RT.d=DTYPES[+k-1];save();stopAutoSoft();all()}
  else if(k==='f'||k==='F'||k==='а'||k==='А')toggleFs();
  else if(k===' '){e.preventDefault();setAuto(!RT.auto)}
  else if(k==='Enter'&&canWrite())openEntry();
});
(function(){var m=g('rtMain'),x0=0,y0=0,t0=0;
  m.addEventListener('touchstart',function(e){var t=e.changedTouches[0];x0=t.clientX;y0=t.clientY;t0=Date.now()},{passive:true});
  m.addEventListener('touchend',function(e){var t=e.changedTouches[0],dx=t.clientX-x0,dy=t.clientY-y0;
    if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.8&&Date.now()-t0<700&&!e.target.closest('.rt-mx')){stopAutoSoft();step(dx<0?1:-1)}},{passive:true})})();

/* данные обновились (раз в несколько минут или после записи): перерисовать, не трогая окно ввода */
var _ra=renderAll;
renderAll=function(){_ra.apply(this,arguments);try{fix();ctlDraw();topDraw();mainDraw(false);if(E.open){ctxDraw();plDraw();if(!E.pilot)formDraw(false)}}catch(e){}};
document.documentElement.classList.add('rt');
document.title='Рейтинг - клуб «Взлёт»';
if(typeof data!=='undefined'&&data)all(true);else{g('rtTop').innerHTML='<div class="rt-ttl"><b>Рейтинг клуба "Взлёт"</b><small>загружаю…</small></div>'}
})();
